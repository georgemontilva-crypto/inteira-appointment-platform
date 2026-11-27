/**
 * Cron de asistencia: activa las citas que empiezan, decide qué pasó con las
 * que terminaron (realizada, asesor ausente, cliente ausente, revisión),
 * cobra o reembolsa, paga al asesor y cierra las que esperaban reseña.
 *
 * Vive aparte de server/_core/index.ts para poder ejecutarlo en pruebas; el
 * servidor lo programa cada 5 minutos.
 */
export async function runAttendanceCron(): Promise<void> {
  try {
    const { getDb } = await import("./db");
    const db = await getDb();
    if (!db) return;
    const client = (db as any).$client;

    // Check 0: activar in_progress para citas que comenzaron hace menos de 55 min
    await new Promise<void>((resolve) => {
      client.execute(
        `UPDATE appointments SET status = 'in_progress', updatedAt = NOW()
         WHERE status = 'scheduled'
         AND appointmentDate <= NOW()
         AND DATE_ADD(appointmentDate, INTERVAL 55 MINUTE) > NOW()`,
        [],
        (err: any, result: any) => {
          if (err) console.error("[Cron] in_progress update error:", err?.message);
          else if (result?.affectedRows > 0) console.log(`[Cron] ${result.affectedRows} cita(s) → in_progress`);
          resolve();
        }
      );
    });

    // Check 1: citas scheduled/in_progress sin cerrar después de 3 horas.
    // Antes se asumía SIEMPRE que el ausente era el usuario y se le pagaba al
    // profesional. Ahora se decide según quién entró realmente a la sala:
    //   · profesional NO entró  → reembolso al usuario, el profesional NO cobra
    //   · profesional entró, usuario no → no-show del usuario (comportamiento previo)
    //   · ninguno entró         → reembolso al usuario (no hubo servicio)
    const staleAppointments = await new Promise<any[]>((resolve) => {
      client.execute(
        `SELECT a.id, a.professionalId, a.userId, a.appointmentDate, a.durationMinutes,
                a.userJoinedAt, a.professionalJoinedAt, a.videoCallId,
                p.tier, p.userId AS profUserId, u.email AS userEmail, u.name AS userName
         FROM appointments a
         JOIN professionals p ON p.id = a.professionalId
         JOIN \`users\` u ON u.id = a.userId
         WHERE a.status IN ('scheduled', 'in_progress')
         AND a.modality = 'online'
         AND DATE_ADD(a.appointmentDate, INTERVAL 3 HOUR) < NOW()`,
        [],
        (err: any, results: any) => {
          if (err) { console.error("[Cron] noshow-select error:", err?.message); resolve([]); }
          else resolve(Array.isArray(results) ? results : []);
        }
      );
    });

    if (staleAppointments.length > 0) {
      const { creditProfessionalEarning } = await import("./professionalWallet");
      const { confirmCredits, refundCredits, getAppointmentBilling } = await import("./credits");
      const { sendCreditsDebitedEmail } = await import("./email");
      const { createNotification } = await import("./notifications");

      const { loadPresence, decideAttendance } = await import("./attendance");

      for (const row of staleAppointments) {
        // Tipo de sesión y de precio según los créditos realmente cobrados.
        // durationMinutes no sirve: básica y premium duran ambas 60 minutos.
        const billing = await getAppointmentBilling(row.id);
        const sessionCost = billing.credits;

        // Presencia REAL en la sala: webhooks de Daily, completados con una
        // consulta directa a Daily si algun evento se perdio.
        const sessionEnd = new Date(
          new Date(row.appointmentDate).getTime() + (row.durationMinutes ?? 60) * 60000
        );
        const presence = await loadPresence(client, row.id, row.videoCallId ?? null);
        const verdict = decideAttendance(presence, sessionEnd);

        // Ni se reembolsa ni se paga sin evidencia clara. Cubre el webhook aun
        // no configurado, la sala usada sin token, y el caso de que ambos
        // entraran pero nunca coincidieran el minimo de minutos.
        if (verdict.outcome === "inconclusive") {
          await new Promise<void>((resolve) => {
            client.execute(
              `UPDATE appointments SET status = 'pending_review', updatedAt = NOW()
               WHERE id = ? AND status IN ('scheduled', 'in_progress')`,
              [row.id],
              (err: any) => { if (err) console.error("[Cron] pending_review update:", err?.message); resolve(); }
            );
          });
          console.warn(`[Cron] Cita ${row.id} a revision manual: ${verdict.reason}`);
          continue;
        }

        // La cita ocurrio: se cierra, se consumen los creditos y se paga.
        if (verdict.outcome === "held") {
          await new Promise<void>((resolve) => {
            client.execute(
              `UPDATE appointments SET status = 'completed', updatedAt = NOW()
               WHERE id = ? AND status IN ('scheduled', 'in_progress')`,
              [row.id],
              (err: any) => { if (err) console.error("[Cron] completed update:", err?.message); resolve(); }
            );
          });
          await confirmCredits(row.id).catch(() => {});
          await creditProfessionalEarning(
            row.professionalId, row.id,
            (row.tier ?? "basic") as "basic" | "pro",
            billing.sessionType, billing.pricingType
          ).catch(() => {});
          console.log(`[Cron] Cita ${row.id} completada (${verdict.overlapMinutes.toFixed(1)} min juntos)`);
          continue;
        }

        if (verdict.outcome === "professional_absent") {
          // ── El profesional nunca entró: la cita no se prestó ──────────────
          await new Promise<void>((resolve) => {
            client.execute(
              `UPDATE appointments SET status = 'canceled', canceledBy = 'professional',
                      canceledAt = NOW(), cancellationReason = 'El profesional no se presentó a la sesión',
                      updatedAt = NOW()
               WHERE id = ? AND status IN ('scheduled', 'in_progress')`,
              [row.id],
              (err: any) => { if (err) console.error("[Cron] prof-noshow update:", err?.message); resolve(); }
            );
          });

          const refunded = await refundCredits(
            row.userId, row.id, "el profesional no se presentó"
          ).catch((e: any) => { console.error("[Cron] refundCredits:", e?.message); return 0; });

          console.log(`[Cron] Professional no-show on appointment ${row.id}: refunded ${refunded} credits to user ${row.userId}`);

          createNotification({
            userId: row.userId,
            type: "refund",
            title: "💰 Créditos devueltos",
            message: `El profesional no se presentó a tu cita. Te devolvimos ${refunded || sessionCost} créditos a tu wallet.`,
            link: "/wallet",
            audience: "user",
          }).catch(() => {});

          createNotification({
            userId: row.profUserId,
            type: "no_show",
            title: "⚠️ No asististe a una asesoría",
            message: "No ingresaste a una sesión agendada. Se reembolsó al cliente y no se generó pago.",
            link: "/profesional/citas",
            audience: "professional",
          }).catch(() => {});

          continue;
        }

        // ── El profesional sí entró y el usuario no: no-show del usuario ────
        await new Promise<void>((resolve) => {
          client.execute(
            `UPDATE appointments SET status = 'no-show', updatedAt = NOW()
             WHERE id = ? AND status IN ('scheduled', 'in_progress')`,
            [row.id],
            (err: any) => { if (err) console.error("[Cron] auto-noshow error:", err?.message); resolve(); }
          );
        });

        await confirmCredits(row.id).catch(() => {});
        await creditProfessionalEarning(
          row.professionalId, row.id,
          (row.tier ?? "basic") as "basic" | "pro",
          billing.sessionType, billing.pricingType
        ).catch(() => {});
        console.log(`[Cron] User no-show: professional ${row.professionalId} credited for appointment ${row.id}`);

        if (row.userEmail) {
          sendCreditsDebitedEmail({
            userEmail: row.userEmail,
            userName: row.userName ?? "Usuario",
            credits: sessionCost,
            appointmentDate: new Date(row.appointmentDate),
          }).catch(() => {});
        }
        createNotification({
          userId: row.userId,
          type: "no_show",
          title: "⚠️ Cita no completada",
          message: "No asististe a tu cita. Los créditos han sido debitados.",
          link: "/citas",
          audience: "user",
        }).catch(() => {});
      }
    }

    // Check presencial. La videollamada no deja rastro de una cita en
    // consultorio: la prueba es el código que el cliente le da al asesor.
    //   · con llegada registrada → al terminar la sesión se completa y se paga
    //   · sin llegada, 3 h después del inicio → revisión (sin pago automático;
    //     el asesor aún puede registrar el código hasta 24 h después)
    {
      const { creditProfessionalEarning } = await import("./professionalWallet");
      const { confirmCredits, getAppointmentBilling } = await import("./credits");
      const { createNotification } = await import("./notifications");

      const conLlegada = await new Promise<any[]>((resolve) => {
        client.execute(
          `SELECT a.id, a.professionalId, a.userId, p.tier, p.userId AS profUserId
             FROM appointments a
             JOIN professionals p ON p.id = a.professionalId
            WHERE a.modality = 'in_person'
              AND a.checkedInAt IS NOT NULL
              AND a.status IN ('scheduled', 'in_progress', 'pending_review')
              AND DATE_ADD(a.appointmentDate, INTERVAL a.durationMinutes MINUTE) < NOW()`,
          [],
          (err: any, r: any) => {
            if (err) { console.error("[Cron] presencial con llegada:", err?.message); resolve([]); }
            else resolve(Array.isArray(r) ? r : []);
          }
        );
      });
      for (const row of conLlegada) {
        try {
          const cambio = await new Promise<number>((resolve) => {
            client.execute(
              `UPDATE appointments SET status = 'completed', updatedAt = NOW()
                WHERE id = ? AND status IN ('scheduled', 'in_progress', 'pending_review')`,
              [row.id],
              (err: any, r: any) => {
                if (err) { console.error("[Cron] presencial completed:", err?.message); resolve(0); }
                else resolve(Number(r?.affectedRows ?? 0));
              }
            );
          });
          // Si otro proceso ya la cerró, no se paga dos veces.
          if (cambio === 0) continue;
          await confirmCredits(row.id).catch(() => {});
          const billing = await getAppointmentBilling(row.id);
          await creditProfessionalEarning(
            row.professionalId, row.id,
            (row.tier ?? "basic") as "basic" | "pro",
            billing.sessionType, billing.pricingType
          ).catch(() => {});
          createNotification({
            userId: row.userId,
            type: "info",
            title: "¡Tu sesión terminó!",
            message: "Cuéntanos cómo te fue con tu especialista.",
            link: "/citas",
            audience: "user",
          }).catch(() => {});
          console.log(`[Cron] Cita presencial ${row.id} completada (llegada registrada)`);
        } catch (e: any) {
          console.error(`[Cron] presencial ${row.id}:`, e?.message);
        }
      }

      const sinLlegada = await new Promise<any[]>((resolve) => {
        client.execute(
          `SELECT a.id, a.userId, p.userId AS profUserId
             FROM appointments a
             JOIN professionals p ON p.id = a.professionalId
            WHERE a.modality = 'in_person'
              AND a.checkedInAt IS NULL
              AND a.status IN ('scheduled', 'in_progress')
              AND DATE_ADD(a.appointmentDate, INTERVAL 3 HOUR) < NOW()`,
          [],
          (err: any, r: any) => {
            if (err) { console.error("[Cron] presencial sin llegada:", err?.message); resolve([]); }
            else resolve(Array.isArray(r) ? r : []);
          }
        );
      });
      for (const row of sinLlegada) {
        await new Promise<void>((resolve) => {
          client.execute(
            `UPDATE appointments SET status = 'pending_review', updatedAt = NOW()
              WHERE id = ? AND status IN ('scheduled', 'in_progress')`,
            [row.id],
            (err: any) => { if (err) console.error("[Cron] presencial a revision:", err?.message); resolve(); }
          );
        });
        createNotification({
          userId: row.profUserId,
          type: "info",
          title: "📍 Falta registrar una llegada",
          message: "No registraste el código de una cita presencial. Hazlo en las próximas 24 horas para que se libere tu pago.",
          link: "/panel-profesional",
          audience: "professional",
        }).catch(() => {});
        console.warn(`[Cron] Cita presencial ${row.id} sin llegada registrada → revisión`);
      }
    }

    // Check 2: auto-completar pending_review con más de 8 horas sin calificar
    const pendingRows = await new Promise<any[]>((resolve) => {
      client.execute(
        `SELECT a.id, a.professionalId, a.userId AS clientUserId, a.durationMinutes, p.tier, p.userId AS profUserId
         FROM appointments a
         JOIN professionals p ON p.id = a.professionalId
         WHERE a.status = 'pending_review'
         AND NOT (a.modality = 'in_person' AND a.checkedInAt IS NULL)
         AND DATE_ADD(a.updatedAt, INTERVAL 8 HOUR) < NOW()`,
        [],
        (err: any, results: any) => {
          if (err) { console.error("[Cron] auto-complete select error:", err?.message); resolve([]); }
          else resolve(Array.isArray(results) ? results : []);
        }
      );
    });

    if (pendingRows.length > 0) {
      console.log(`[Cron] auto-complete: ${pendingRows.length} pending_review → completing`);
      const { creditProfessionalEarning } = await import("./professionalWallet");
      const { createNotification } = await import("./notifications");
      const { confirmCredits, getAppointmentBilling: getBilling } = await import("./credits");

      for (const row of pendingRows) {
        try {
          await new Promise<void>((resolve) => {
            client.execute(
              `INSERT IGNORE INTO reviews (userId, professionalId, appointmentId, rating, comment, isVerified, createdAt, updatedAt)
               VALUES (?, ?, ?, 5, 'Completada automáticamente', 0, NOW(), NOW())`,
              [row.clientUserId, row.professionalId, row.id],
              (err: any) => { if (err) console.error("[Cron] auto-review insert:", err?.message); resolve(); }
            );
          });
          await confirmCredits(row.id).catch(() => {});
          await new Promise<void>((resolve) => {
            client.execute(
              "UPDATE appointments SET status = 'completed', updatedAt = NOW() WHERE id = ?",
              [row.id],
              (err: any) => { if (err) console.error("[Cron] auto-complete update:", err?.message); resolve(); }
            );
          });
          const billing = await getBilling(row.id);
          const { netAmount } = await creditProfessionalEarning(
            row.professionalId, row.id, (row.tier ?? "basic") as "basic" | "pro",
            billing.sessionType, billing.pricingType
          );
          createNotification({
            userId: row.profUserId,
            type: "new_earning",
            title: "Asesoría completada automáticamente",
            message: `Una asesoría fue completada automáticamente. Se acreditaron $${netAmount} MXN a tu wallet.`,
            link: "/profesional/wallet",
            audience: "professional",
          }).catch(() => {});
        } catch (rowErr: any) {
          console.error(`[Cron] auto-complete row ${row.id} error:`, rowErr?.message);
        }
      }
    }
  } catch(e: any) {
    console.error("[Cron] auto-noshow exception:", e?.message);
  }
}
