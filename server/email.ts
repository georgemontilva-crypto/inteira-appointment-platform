/**
 * Email service for automatic notifications
 * Uses Resend API (or fallback to console logging in dev)
 */


export interface EmailData {
  to: string;
  subject: string;
  html: string;
  attachments?: Array<{ filename: string; content: string }>;
}

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.FROM_EMAIL || "noreply@inteira.mx";

async function sendEmail(data: EmailData): Promise<boolean> {
  if (!RESEND_API_KEY) {
    console.log(`[Email] DEV MODE - Would send email to ${data.to}:`);
    console.log(`  Subject: ${data.subject}`);
    return true;
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `Inteira <${FROM_EMAIL}>`,
        to: Array.isArray(data.to)
          ? data.to
          : data.to.split(",").map((e) => e.trim()).filter(Boolean),
        subject: data.subject,
        html: data.html,
        ...(data.attachments?.length ? { attachments: data.attachments } : {}),
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("[Email] Send failed:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("[Email] Error sending email:", error);
    return false;
  }
}

// Email templates
function baseTemplate(content: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body { font-family: 'Inter', Arial, sans-serif; background: #f5f7f5; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(96,117,98,0.12); }
        .header { background: #607562; padding: 24px 40px; text-align: center; }
        .header img { height: 38px; width: auto; object-fit: contain; }
        .body { padding: 40px; }
        .body p { color: #374151; line-height: 1.7; margin: 0 0 16px; }
        .btn { display: inline-block; background: #607562; color: #ffffff !important; text-decoration: none !important; padding: 12px 24px; border-radius: 8px; font-weight: 600; font-size: 13px; margin: 20px 0; }
        .info-box { background: #f5f7f5; border-left: 4px solid #607562; padding: 16px 20px; border-radius: 0 8px 8px 0; margin: 20px 0; }
        .info-box p { margin: 4px 0; font-size: 14px; }
        .info-box strong { color: #607562; }
        .footer { background: #f9fafb; padding: 24px 40px; text-align: center; border-top: 1px solid #e5e7eb; }
        .footer p { color: #9ca3af; font-size: 13px; margin: 0; }
        .footer a { color: #607562; text-decoration: none; }
        .divider { height: 1px; background: #e5e7eb; margin: 24px 0; }
      </style>
    </head>
    <body>
      <div style="padding: 24px;">
        <div class="container">
          <div class="header">
            <img src="https://pub-cc4c932d49594db4a582c5a9a78363f7.r2.dev/logo-11.png" alt="Inteira" style="height:38px; width:auto; object-fit:contain;">
          </div>
          <div class="body">
            ${content}
          </div>
          <div class="footer">
            <p>© 2026 Inteira. Todos los derechos reservados.</p>
            <p style="margin-top:8px;"><a href="https://inteira.app">inteira.app</a> · <a href="https://inteira.app/privacidad">Privacidad</a> · <a href="https://inteira.app/terminos">Términos</a></p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
}

// 1. Appointment confirmation
export async function sendAppointmentConfirmation(params: {
  userEmail: string;
  userName: string;
  professionalName: string;
  specialty: string;
  appointmentDate: Date;
  durationMinutes: number;
  videoCallType: string;
  videoCallLink: string;
}): Promise<boolean> {
  const dateStr = params.appointmentDate.toLocaleDateString("es-MX", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const timeStr = params.appointmentDate.toLocaleTimeString("es-MX", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const content = `
    <p>Hola <strong>${params.userName}</strong>,</p>
    <p>Tu cita ha sido confirmada exitosamente. Aquí están los detalles:</p>
    <div class="info-box">
      <p><strong>Especialista:</strong> ${params.professionalName}</p>
      <p><strong>Especialidad:</strong> ${params.specialty}</p>
      <p><strong>Fecha:</strong> ${dateStr}</p>
      <p><strong>Hora:</strong> ${timeStr}</p>
      <p><strong>Duración:</strong> ${params.durationMinutes} minutos</p>
      <p><strong>Plataforma:</strong> Daily (videollamada integrada)</p>
    </div>
    <p>Para unirte a tu cita, haz clic en el siguiente enlace:</p>
    <a href="${params.videoCallLink}" class="btn">Unirse a la videollamada</a>
    <div class="divider"></div>
    <p style="font-size:13px; color:#6b7280;">Recuerda unirte 5 minutos antes de tu cita. Si necesitas cancelar, hazlo con al menos 4 horas de anticipación desde tu panel de usuario.</p>
  `;

  return sendEmail({
    to: params.userEmail,
    subject: `✅ Cita confirmada con ${params.professionalName} - ${dateStr}`,
    html: baseTemplate(content),
  });
}

// 2. Appointment reminder (24h or 1h before)
export async function sendAppointmentReminder(params: {
  userEmail: string;
  userName: string;
  professionalName: string;
  appointmentDate: Date;
  videoCallLink: string;
  hoursUntil: 24 | 1;
}): Promise<boolean> {
  const dateStr = params.appointmentDate.toLocaleDateString("es-MX", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
  const timeStr = params.appointmentDate.toLocaleTimeString("es-MX", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const timeLabel = params.hoursUntil === 24 ? "mañana" : "en 1 hora";
  const emoji = params.hoursUntil === 24 ? "📅" : "⏰";

  const content = `
    <p>Hola <strong>${params.userName}</strong>,</p>
    <p>Te recordamos que tienes una cita <strong>${timeLabel}</strong> con <strong>${params.professionalName}</strong>.</p>
    <div class="info-box">
      <p><strong>Fecha:</strong> ${dateStr}</p>
      <p><strong>Hora:</strong> ${timeStr}</p>
      <p><strong>Especialista:</strong> ${params.professionalName}</p>
    </div>
    <a href="${params.videoCallLink}" class="btn">Unirse a la videollamada</a>
    <div class="divider"></div>
    <p style="font-size:13px; color:#6b7280;">Asegúrate de tener una conexión estable a internet y un lugar tranquilo para tu consulta.</p>
  `;

  return sendEmail({
    to: params.userEmail,
    subject: `${emoji} Recordatorio: Cita con ${params.professionalName} ${timeLabel}`,
    html: baseTemplate(content),
  });
}

// 3. Professional approval notification
export async function sendProfessionalApproval(params: {
  professionalEmail: string;
  professionalName: string;
  specialty: string;
  approved: boolean;
  rejectionReason?: string;
}): Promise<boolean> {
  const content = params.approved
    ? `
      <p>Hola <strong>${params.professionalName}</strong>,</p>
      <p>¡Felicitaciones! Tu solicitud de registro como profesional en <strong>Inteira</strong> ha sido <strong style="color:#10B981;">aprobada</strong>.</p>
      <div class="info-box">
        <p><strong>Especialidad:</strong> ${params.specialty}</p>
        <p><strong>Estado:</strong> Activo y visible para los usuarios</p>
      </div>
      <p>Ya puedes configurar tu disponibilidad horaria y comenzar a recibir citas.</p>
      <div class="info-box">
        <p><strong>¿Cómo acceder?</strong></p>
        <p>Ve a <a href="https://inteira.app/login" style="color:#607562;">inteira.app/login</a> e inicia sesión con tu correo <strong>${params.professionalEmail}</strong> y la contraseña que configuraste al registrarte.</p>
        <p style="margin-top:8px;font-size:13px;color:#6b7280;">Si no recuerdas tu contraseña o te registraste sin una, selecciona la pestaña <strong>"Código por email"</strong> en la página de inicio de sesión para recibir un código de acceso.</p>
      </div>
      <a href="https://inteira.app/login" class="btn">Ir a mi panel</a>
    `
    : `
      <p>Hola <strong>${params.professionalName}</strong>,</p>
      <p>Lamentamos informarte que tu solicitud de registro como profesional en <strong>Inteira</strong> no ha sido aprobada en esta ocasión.</p>
      ${params.rejectionReason ? `<div class="info-box"><p><strong>Motivo:</strong> ${params.rejectionReason}</p></div>` : ""}
      <p>Si tienes preguntas o deseas apelar esta decisión, por favor contáctanos a <a href="mailto:soporte@inteira.mx">soporte@inteira.mx</a>.</p>
    `;

  return sendEmail({
    to: params.professionalEmail,
    subject: params.approved
      ? "✅ Tu solicitud como profesional ha sido aprobada - Inteira"
      : "❌ Actualización sobre tu solicitud en Inteira",
    html: baseTemplate(content),
  });
}

// 4. Appointment cancellation (to user)
export async function sendAppointmentCancellation(params: {
  userEmail: string;
  userName: string;
  professionalName: string;
  appointmentDate: Date;
  canceledBy: string;
  hasRefund: boolean;
  credits: number;
}): Promise<boolean> {
  const dateStr = params.appointmentDate.toLocaleDateString("es-MX", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
  const timeStr = params.appointmentDate.toLocaleTimeString("es-MX", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const creditsLine = params.hasRefund
    ? `<p style="color:#16a34a;">✅ Tus <strong>${params.credits} créditos</strong> retenidos serán restituidos a tu wallet.</p>`
    : `<p style="color:#dc2626;">❌ Los <strong>${params.credits} créditos</strong> no serán reembolsados (cancelación con menos de 4 horas de anticipación).</p>`;

  const content = `
    <p>Hola <strong>${params.userName}</strong>,</p>
    <p>Tu cita ha sido <strong style="color:#EF4444;">cancelada</strong>.</p>
    <div class="info-box">
      <p><strong>Especialista:</strong> ${params.professionalName}</p>
      <p><strong>Fecha:</strong> ${dateStr} a las ${timeStr}</p>
      <p><strong>Cancelada por:</strong> ${params.canceledBy}</p>
    </div>
    ${creditsLine}
    <p>Puedes agendar una nueva cita cuando lo desees.</p>
    <a href="https://inteira.app" class="btn">Agendar nueva cita</a>
  `;

  return sendEmail({
    to: params.userEmail,
    subject: `❌ Cita cancelada con ${params.professionalName}`,
    html: baseTemplate(content),
  });
}

// 4b. Appointment cancellation (to professional)
export async function sendAppointmentCancelledToProfessional(params: {
  professionalEmail: string;
  professionalName: string;
  patientName: string;
  appointmentDate: Date;
  canceledBy: "user" | "professional" | "admin";
}): Promise<boolean> {
  const dateStr = params.appointmentDate.toLocaleDateString("es-MX", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });
  const timeStr = params.appointmentDate.toLocaleTimeString("es-MX", {
    hour: "2-digit", minute: "2-digit",
  });

  const canceledByLabel = params.canceledBy === "user"
    ? "el cliente"
    : params.canceledBy === "professional"
    ? "tú (profesional)"
    : "el administrador";

  const content = `
    <p>Hola <strong>${params.professionalName}</strong>,</p>
    <p>Una cita ha sido <strong style="color:#EF4444;">cancelada</strong> por ${canceledByLabel}.</p>
    <div class="info-box">
      <p><strong>Cliente:</strong> ${params.patientName}</p>
      <p><strong>Fecha:</strong> ${dateStr}</p>
      <p><strong>Hora:</strong> ${timeStr} hrs</p>
    </div>
    <p>El horario quedó disponible nuevamente para nuevas reservas.</p>
    <a href="https://inteira.app" class="btn">Ver mi panel</a>
  `;

  return sendEmail({
    to: params.professionalEmail,
    subject: `❌ Cita cancelada — ${params.patientName} · ${dateStr}`,
    html: baseTemplate(content),
  });
}

// 5a. Professional earning notification
export async function sendProfessionalEarningNotification(params: {
  professionalEmail: string;
  professionalName: string;
  netAmount: number;
  appointmentId: number;
}): Promise<boolean> {
  const content = `
    <p>Hola <strong>${params.professionalName}</strong>,</p>
    <p>Tu sesión ha sido marcada como completada. Se han acreditado <strong style="color:#10B981;">$${params.netAmount.toFixed(2)} MXN</strong> a tu wallet.</p>
    <div class="info-box">
      <p><strong>Cita #:</strong> ${params.appointmentId}</p>
      <p><strong>Monto acreditado:</strong> $${params.netAmount.toFixed(2)} MXN</p>
    </div>
    <p>Puedes solicitar un retiro desde tu panel cuando tu saldo sea de al menos $500 MXN.</p>
    <a href="https://inteira.app" class="btn">Ver mi wallet</a>
  `;

  return sendEmail({
    to: params.professionalEmail,
    subject: `💰 Sesión completada — $${params.netAmount.toFixed(2)} MXN acreditados`,
    html: baseTemplate(content),
  });
}

// 5. Subscription status change
export async function sendSubscriptionUpdate(params: {
  userEmail: string;
  userName: string;
  planName: string;
  status: "activated" | "canceled" | "renewed";
}): Promise<boolean> {
  const messages = {
    activated: {
      emoji: "🎉",
      title: "¡Suscripción activada!",
      body: `Tu plan <strong>${params.planName}</strong> ha sido activado exitosamente. Ya puedes comenzar a agendar citas con nuestros especialistas.`,
    },
    canceled: {
      emoji: "⚠️",
      title: "Suscripción cancelada",
      body: `Tu plan <strong>${params.planName}</strong> ha sido cancelado. Seguirás teniendo acceso hasta el final del período de facturación actual.`,
    },
    renewed: {
      emoji: "🔄",
      title: "Suscripción renovada",
      body: `Tu plan <strong>${params.planName}</strong> ha sido renovado automáticamente. ¡Gracias por continuar con nosotros!`,
    },
  };

  const msg = messages[params.status];

  const content = `
    <p>Hola <strong>${params.userName}</strong>,</p>
    <p>${msg.body}</p>
    <a href="https://inteira.app" class="btn">Ir a mi dashboard</a>
  `;

  return sendEmail({
    to: params.userEmail,
    subject: `${msg.emoji} ${msg.title} - Inteira`,
    html: baseTemplate(content),
  });
}

// 7. OTP verification email
export async function sendOtpEmail(params: {
  email: string;
  firstName: string;
  code: string;
}): Promise<boolean> {
  const content = `
    <p>Hola <strong>${params.firstName}</strong>,</p>
    <p>Tu código de verificación para Inteira es:</p>
    <div style="text-align:center; margin: 32px 0;">
      <span style="font-size:42px; font-weight:700; letter-spacing:12px; color:#607562; background:#eef2ee; padding:16px 24px; border-radius:12px; display:inline-block;">${params.code}</span>
    </div>
    <p style="text-align:center; color:#666; font-size:13px;">Este código expira en <strong>10 minutos</strong>. Si no solicitaste esto, ignora este mensaje.</p>
  `;

  return sendEmail({
    to: params.email,
    subject: `${params.code} es tu código de verificación — Inteira`,
    html: baseTemplate(content),
  });
}

// 8. Professional — appointment confirmation (sent to the professional)
export async function sendProfessionalAppointmentConfirmation(params: {
  professionalEmail: string;
  professionalName: string;
  patientName: string;
  appointmentDate: Date;
  durationMinutes: number;
  videoCallLink: string;
}): Promise<boolean> {
  const dateStr = params.appointmentDate.toLocaleDateString("es-MX", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });
  const timeStr = params.appointmentDate.toLocaleTimeString("es-MX", {
    hour: "2-digit", minute: "2-digit",
  });

  const content = `
    <p>Hola <strong>${params.professionalName}</strong>,</p>
    <p>Tienes una <strong>nueva cita reservada</strong>. Un cliente ha agendado una sesión contigo.</p>
    <div class="info-box">
      <p><strong>Cliente:</strong> ${params.patientName}</p>
      <p><strong>Fecha:</strong> ${dateStr}</p>
      <p><strong>Hora:</strong> ${timeStr} hrs</p>
      <p><strong>Duración:</strong> ${params.durationMinutes} minutos</p>
    </div>
    <p>Recuerda estar disponible 5 minutos antes del inicio de la sesión.</p>
    <a href="https://inteira.app/panel-profesional" class="btn">Ver mi panel</a>
    <div class="divider"></div>
    <p style="font-size:13px; color:#6b7280;">Si necesitas cancelar, hazlo con al menos 12 horas de anticipación para evitar penalizaciones.</p>
  `;

  return sendEmail({
    to: params.professionalEmail,
    subject: `📅 Nueva cita reservada — ${params.patientName} · ${dateStr} ${timeStr}`,
    html: baseTemplate(content),
  });
}

// 8. Welcome email for new users
export async function sendWelcomeEmail(params: {
  userEmail: string;
  userName: string;
}): Promise<boolean> {
  const content = `
    <p>Hola <strong>${params.userName}</strong>,</p>
    <p>¡Bienvenido a <strong>Inteira</strong>! Estamos muy contentos de tenerte aquí.</p>
    <p>En Inteira conectamos personas con especialistas verificados para asesorías personalizadas por videollamada. Así funciona:</p>
    <div class="info-box">
      <p><strong>1. Explora especialistas</strong> — Encuentra profesionales verificados en tu área de interés.</p>
      <p><strong>2. Agenda tu cita</strong> — Elige el horario que mejor te convenga.</p>
      <p><strong>3. Conéctate</strong> — Únete a tu sesión por videollamada integrada, sin apps externas.</p>
    </div>
    <p>Tus primeros créditos te esperan. Comienza explorando nuestros especialistas disponibles.</p>
    <a href="https://inteira.app" class="btn">Explorar especialistas</a>
    <div class="divider"></div>
    <p style="font-size:13px; color:#6b7280;">¿Tienes preguntas? Escríbenos a <a href="mailto:soporte@inteira.mx" style="color:#607562;">soporte@inteira.mx</a></p>
  `;

  return sendEmail({
    to: params.userEmail,
    subject: `¡Bienvenido a Inteira, ${params.userName}!`,
    html: baseTemplate(content),
  });
}

// 9. Credits purchase confirmation
export async function sendCreditsPurchaseConfirmation(params: {
  userEmail: string;
  userName: string;
  credits: number;
  priceMXN: number;
  expiresAt: Date;
}): Promise<boolean> {
  const expiresStr = params.expiresAt.toLocaleDateString("es-MX", {
    year: "numeric", month: "long", day: "numeric",
  });

  const content = `
    <p>Hola <strong>${params.userName}</strong>,</p>
    <p>Tu compra de créditos ha sido procesada exitosamente. 🎉</p>
    <div class="info-box">
      <p><strong>Créditos adquiridos:</strong> ${params.credits.toLocaleString("es-MX")} créditos</p>
      <p><strong>Total pagado:</strong> $${params.priceMXN.toLocaleString("es-MX")} MXN</p>
      <p><strong>Válidos hasta:</strong> ${expiresStr}</p>
    </div>
    <p>Ya puedes usar tus créditos para agendar sesiones con nuestros especialistas.</p>
    <a href="https://inteira.app/especialidades" class="btn">Agendar una sesión</a>
    <div class="divider"></div>
    <p style="font-size:13px; color:#6b7280;">Los créditos tienen una vigencia de 60 días a partir de su adquisición. Consulta tu saldo en tu wallet.</p>
  `;

  return sendEmail({
    to: params.userEmail,
    subject: `✅ Compra de créditos confirmada — ${params.credits.toLocaleString("es-MX")} créditos`,
    html: baseTemplate(content),
  });
}

// 10. Admin — new user registration notification
export async function sendAdminNewUserRegistration(params: {
  userName: string;
  userEmail: string;
  adminEmails: string[];
}): Promise<boolean> {
  const content = `
    <p>Hola,</p>
    <p>Un nuevo usuario se ha registrado en Inteira.</p>
    <div class="info-box">
      <p><strong>Nombre:</strong> ${params.userName}</p>
      <p><strong>Email:</strong> ${params.userEmail}</p>
      <p><strong>Fecha:</strong> ${new Date().toLocaleDateString("es-MX", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
    </div>
    <a href="https://inteira.app" class="btn">Ver panel admin</a>
  `;

  const results = await Promise.all(
    params.adminEmails.map((adminEmail) =>
      sendEmail({
        to: adminEmail,
        subject: "👤 Nuevo usuario registrado en Inteira",
        html: baseTemplate(content),
      })
    )
  );
  return results.every(Boolean);
}

// 11. Appointment reminder — 15 minutes before (to user)
export async function sendAppointmentReminder15min(params: {
  userEmail: string;
  userName: string;
  professionalName: string;
  appointmentDate: Date;
  videoCallLink: string;
}): Promise<boolean> {
  const timeStr = params.appointmentDate.toLocaleTimeString("es-MX", {
    hour: "2-digit", minute: "2-digit",
  });

  const content = `
    <p>Hola <strong>${params.userName}</strong>,</p>
    <p>Tu cita con <strong>${params.professionalName}</strong> comienza en <strong>15 minutos</strong> (${timeStr} hrs).</p>
    <p>Asegúrate de tener lista tu conexión a internet y un lugar tranquilo.</p>
    <a href="${params.videoCallLink}" class="btn">Unirse ahora</a>
    <div class="divider"></div>
    <p style="font-size:13px; color:#6b7280;">El enlace de videollamada también está disponible en tu panel de citas.</p>
  `;

  return sendEmail({
    to: params.userEmail,
    subject: `⏰ Tu cita comienza en 15 minutos — ${params.professionalName}`,
    html: baseTemplate(content),
  });
}

// 11b. Appointment reminder — 15 minutes before (to professional)
export async function sendProfessionalReminder15min(params: {
  professionalEmail: string;
  professionalName: string;
  clientName: string;
  appointmentDate: Date;
  videoCallLink: string;
}): Promise<boolean> {
  const timeStr = params.appointmentDate.toLocaleTimeString("es-MX", {
    hour: "2-digit", minute: "2-digit",
  });

  const content = `
    <p>Hola <strong>${params.professionalName}</strong>,</p>
    <p>Tu sesión con <strong>${params.clientName}</strong> comienza en <strong>15 minutos</strong> (${timeStr} hrs).</p>
    <p>Recuerda estar disponible y con tu conexión lista antes del inicio.</p>
    <a href="${params.videoCallLink}" class="btn">Unirse ahora</a>
    <div class="divider"></div>
    <p style="font-size:13px; color:#6b7280;">El enlace de videollamada también está disponible en tu panel de especialista.</p>
  `;

  return sendEmail({
    to: params.professionalEmail,
    subject: `⏰ Tu sesión con ${params.clientName} comienza en 15 minutos`,
    html: baseTemplate(content),
  });
}

// 6. Admin — new professional request
export async function sendAdminNewProfessionalRequest(params: {
  adminEmail: string;
  professionalName: string;
  professionalEmail: string;
}): Promise<boolean> {
  const content = `
    <p>Hola,</p>
    <p>El usuario <strong>${params.professionalName}</strong> (${params.professionalEmail}) ha enviado una solicitud para registrarse como profesional en Inteira.</p>
    <div class="info-box">
      <p><strong>Nombre:</strong> ${params.professionalName}</p>
      <p><strong>Email:</strong> ${params.professionalEmail}</p>
    </div>
    <a href="https://inteira.app" class="btn">Revisar solicitud</a>
  `;

  return sendEmail({
    to: params.adminEmail,
    subject: "Nueva solicitud de profesional — Inteira",
    html: baseTemplate(content),
  });
}

// 12. Credits debited notification (sent when user joins the video call)
export async function sendCreditsDebitedEmail(params: {
  userEmail: string;
  userName: string;
  credits: number;
  appointmentDate: Date;
}): Promise<boolean> {
  const dateStr = params.appointmentDate.toLocaleDateString("es-MX", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });
  const content = `
    <p>Hola <strong>${params.userName}</strong>,</p>
    <p>Se han debitado <strong>${params.credits} créditos</strong> de tu wallet por tu sesión del ${dateStr}.</p>
    <div class="info-box">
      <p><strong>Créditos debitados:</strong> ${params.credits}</p>
      <p><strong>Fecha de sesión:</strong> ${dateStr}</p>
    </div>
    <p>Gracias por usar Inteira. Recuerda calificar a tu especialista al finalizar la sesión.</p>
    <a href="https://inteira.app" class="btn">Ver mis citas</a>
  `;
  return sendEmail({
    to: params.userEmail,
    subject: `💳 ${params.credits} créditos debitados — Inteira`,
    html: baseTemplate(content),
  });
}

// 13. Withdrawal request notification to admin
export async function sendWithdrawalRequestEmail(params: {
  adminEmail: string;
  professionalName: string;
  professionalEmail: string;
  amount: number;
  paymentMethod: string;
  paymentDetails: string;
  notes?: string;
}): Promise<boolean> {
  const methodLabels: Record<string, string> = {
    clabe: "CLABE (transferencia bancaria)",
    binance: "Binance Pay",
    paypal: "PayPal",
    other: "Otro",
  };
  const content = `
    <p>Hola,</p>
    <p>El profesional <strong>${params.professionalName}</strong> ha solicitado un retiro de fondos.</p>
    <div class="info-box">
      <p><strong>Profesional:</strong> ${params.professionalName}</p>
      <p><strong>Email:</strong> ${params.professionalEmail}</p>
      <p><strong>Monto solicitado:</strong> $${params.amount.toLocaleString("es-MX")} MXN</p>
      <p><strong>Método de pago:</strong> ${methodLabels[params.paymentMethod] ?? params.paymentMethod}</p>
      <p><strong>Detalles de pago:</strong> ${params.paymentDetails}</p>
      ${params.notes ? `<p><strong>Nota del profesional:</strong> ${params.notes}</p>` : ""}
      <p><strong>Fecha de solicitud:</strong> ${new Date().toLocaleDateString("es-MX", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
    </div>
    <a href="https://inteira.app/admin" class="btn">Ver panel admin</a>
  `;
  return sendEmail({
    to: params.adminEmail,
    subject: `💸 Nueva solicitud de retiro — ${params.professionalName} $${params.amount.toLocaleString("es-MX")} MXN`,
    html: baseTemplate(content),
  });
}

// 14. Withdrawal rejected notification to professional
export async function sendWithdrawalRejectedEmail(params: {
  professionalEmail: string;
  professionalName: string;
  amount: number;
  adminNote?: string;
}): Promise<boolean> {
  const content = `
    <p>Hola <strong>${params.professionalName}</strong>,</p>
    <p>Tu solicitud de retiro de <strong>$${params.amount.toLocaleString("es-MX")} MXN</strong> no pudo ser procesada en esta ocasión.</p>
    ${params.adminNote ? `
    <div class="info-box">
      <p><strong>Motivo:</strong> ${params.adminNote}</p>
    </div>` : ""}
    <p>Tu balance no ha sido modificado. Puedes enviar una nueva solicitud desde tu panel de ganancias cuando lo desees.</p>
    <p>Si tienes dudas, responde a este correo o contáctanos desde la plataforma.</p>
    <a href="https://inteira.app/panel-profesional#ganancias" class="btn">Ver mis ganancias</a>
  `;
  return sendEmail({
    to: params.professionalEmail,
    subject: `❌ Tu solicitud de retiro de $${params.amount.toLocaleString("es-MX")} MXN fue rechazada — Inteira`,
    html: baseTemplate(content),
  });
}

// 15. Withdrawal received confirmation to professional
export async function sendWithdrawalReceivedEmail(params: {
  professionalEmail: string;
  professionalName: string;
  amount: number;
  paymentMethod: string;
  paymentDetails: string;
}): Promise<boolean> {
  const methodLabels: Record<string, string> = {
    clabe: "CLABE (transferencia bancaria)",
    binance: "Binance Pay",
    paypal: "PayPal",
    other: "Otro",
  };
  const content = `
    <p>Hola <strong>${params.professionalName}</strong>,</p>
    <p>Hemos recibido tu solicitud de retiro. La revisaremos y procesaremos el <strong>próximo lunes</strong>.</p>
    <div class="info-box">
      <p><strong>Monto solicitado:</strong> $${params.amount.toLocaleString("es-MX")} MXN</p>
      <p><strong>Método de pago:</strong> ${methodLabels[params.paymentMethod] ?? params.paymentMethod}</p>
      <p><strong>Detalles:</strong> ${params.paymentDetails}</p>
      <p><strong>Fecha de solicitud:</strong> ${new Date().toLocaleDateString("es-MX", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
    </div>
    <p>Recibirás otro correo cuando tu retiro haya sido procesado. Si tienes alguna pregunta, responde a este mensaje.</p>
    <a href="https://inteira.app/panel-profesional#ganancias" class="btn">Ver mis ganancias</a>
  `;
  return sendEmail({
    to: params.professionalEmail,
    subject: `📩 Solicitud de retiro recibida — $${params.amount.toLocaleString("es-MX")} MXN`,
    html: baseTemplate(content),
  });
}

// 16. Withdrawal paid confirmation to professional
export async function sendWithdrawalPaidEmail(params: {
  professionalEmail: string;
  professionalName: string;
  amount: number;
  paymentMethod: string;
  attachment?: { base64: string; name: string; mimeType: string };
}): Promise<boolean> {
  const methodLabels: Record<string, string> = {
    clabe: "CLABE (transferencia bancaria)",
    binance: "Binance Pay",
    paypal: "PayPal",
    other: "Otro",
  };
  const content = `
    <p>Hola <strong>${params.professionalName}</strong>,</p>
    <p>Tu solicitud de retiro ha sido procesada exitosamente. 🎉</p>
    <div class="info-box">
      <p><strong>Monto pagado:</strong> $${params.amount.toLocaleString("es-MX")} MXN</p>
      <p><strong>Método utilizado:</strong> ${methodLabels[params.paymentMethod] ?? params.paymentMethod}</p>
      ${params.attachment ? `<p><strong>Comprobante:</strong> adjunto a este correo (${params.attachment.name})</p>` : ""}
    </div>
    <p>El dinero puede tardar hasta <strong>7 días hábiles</strong> en llegar dependiendo de tu método de pago.</p>
    <p>Si tienes alguna pregunta, responde a este correo o contáctanos desde la plataforma.</p>
    <a href="https://inteira.app/panel-profesional#ganancias" class="btn">Ver mis ganancias</a>
  `;
  return sendEmail({
    to: params.professionalEmail,
    subject: `✅ Tu retiro de $${params.amount.toLocaleString("es-MX")} MXN fue procesado — Inteira`,
    html: baseTemplate(content),
    attachments: params.attachment
      ? [{ filename: params.attachment.name, content: params.attachment.base64 }]
      : [],
  });
}

export async function sendProfessionalRevocationEmail(params: {
  professionalEmail: string;
  professionalName: string;
  reason: string;
}): Promise<boolean> {
  const content = `
    <p>Hola <strong>${params.professionalName}</strong>,</p>
    <p>Te informamos que tu acceso como profesional en Inteira ha sido <strong>revocado</strong>.</p>
    <div class="info-box">
      <p><strong>Motivo:</strong> ${params.reason}</p>
    </div>
    <p>Si consideras que esta decisión fue un error o deseas más información, puedes contactarnos en
    <a href="mailto:info@inteira.app" style="color:#607562;">info@inteira.app</a>.</p>
    <p>Gracias por haber formado parte de Inteira.</p>
  `;
  return sendEmail({
    to: params.professionalEmail,
    subject: 'Tu acceso como profesional en Inteira ha sido revocado',
    html: baseTemplate(content),
  });
}

// Confirmation to specialist when their application is received (no account yet)
export async function sendProfessionalApplicationReceived(params: {
  professionalEmail: string;
  professionalName: string;
}): Promise<boolean> {
  const content = `
    <p>Hola <strong>${params.professionalName}</strong>,</p>
    <p>Hemos recibido tu solicitud para unirte a <strong>Inteira</strong> como especialista. Nuestro equipo la revisará en los próximos días hábiles.</p>
    <div class="info-box">
      <p><strong>¿Qué sigue?</strong></p>
      <p>Una vez aprobada tu solicitud, recibirás un correo con instrucciones para acceder a tu panel de especialista.</p>
    </div>
    <p>Si tienes preguntas, escríbenos a <a href="mailto:soporte@inteira.app">soporte@inteira.app</a>.</p>
  `;
  return sendEmail({
    to: params.professionalEmail,
    subject: "📋 Solicitud recibida — Inteira",
    html: baseTemplate(content),
  });
}
