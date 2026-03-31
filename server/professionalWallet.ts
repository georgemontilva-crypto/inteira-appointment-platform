import { getDb } from "./db";

// Platform commission rates by tier
export const PROFESSIONAL_COMMISSIONS: Record<"basic" | "pro", number> = {
  basic: 0.20, // 20% platform fee — professional earns 80%
  pro:   0.15, // 15% platform fee — professional earns 85%
};

const GROSS_AMOUNT_MXN = 350; // Fixed session cost in MXN

export async function creditProfessionalEarning(
  professionalId: number,
  appointmentId: number,
  tier: "basic" | "pro"
): Promise<{ netAmount: number; commissionAmount: number }> {
  const db = await getDb();
  if (!db) throw new Error("DB not available");

  const commissionRate = PROFESSIONAL_COMMISSIONS[tier];
  const grossAmount = GROSS_AMOUNT_MXN;
  const commissionAmount = Math.round(grossAmount * commissionRate * 100) / 100;
  const netAmount = Math.round((grossAmount - commissionAmount) * 100) / 100;

  const client = (db as any).$client;

  await new Promise<void>((resolve) => {
    client.execute(
      `INSERT INTO professionalEarnings
         (professionalId, appointmentId, grossAmount, commissionRate, commissionAmount, netAmount, status)
       VALUES (?, ?, ?, ?, ?, ?, 'credited')`,
      [professionalId, appointmentId, grossAmount, commissionRate, commissionAmount, netAmount],
      (err: any) => { if (err && !String(err).includes("Duplicate")) console.error("[wallet] earnings insert:", err?.message); resolve(); }
    );
  });

  await new Promise<void>((resolve, reject) => {
    client.execute(
      `INSERT INTO professionalWallet (professionalId, balance, pendingWithdrawal, totalEarned, totalWithdrawn)
       VALUES (?, ?, 0, ?, 0)
       ON DUPLICATE KEY UPDATE
         balance     = balance     + VALUES(balance),
         totalEarned = totalEarned + VALUES(totalEarned)`,
      [professionalId, netAmount, netAmount],
      (err: any) => { if (err) reject(err); else resolve(); }
    );
  });

  return { netAmount, commissionAmount };
}

export async function chargeProfessionalPenalty(
  professionalId: number,
  amount: number
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await (db as any).$client.execute(
    `UPDATE professionalWallet
     SET balance = GREATEST(0, balance - ?)
     WHERE professionalId = ?`,
    [amount, professionalId]
  );
}

export async function getProfessionalWallet(professionalId: number) {
  const db = await getDb();
  if (!db) return null;
  const client = (db as any).$client;
  return new Promise<any>((resolve, reject) => {
    client.execute(
      "SELECT * FROM professionalWallet WHERE professionalId = ? LIMIT 1",
      [professionalId],
      (err: any, results: any) => {
        if (err) reject(err);
        else resolve(Array.isArray(results) ? results[0] ?? null : null);
      }
    );
  });
}

export async function getProfessionalEarningsHistory(professionalId: number) {
  const db = await getDb();
  if (!db) return [];
  const client = (db as any).$client;
  return new Promise<any[]>((resolve) => {
    client.execute(
      `SELECT pe.*, a.appointmentDate
       FROM professionalEarnings pe
       LEFT JOIN appointments a ON pe.appointmentId = a.id
       WHERE pe.professionalId = ?
       ORDER BY pe.createdAt DESC
       LIMIT 50`,
      [professionalId],
      (err: any, results: any) => {
        if (err) { console.error("[wallet] earningsHistory error:", err?.message); resolve([]); }
        else resolve(Array.isArray(results) ? results : []);
      }
    );
  });
}

export async function getProfessionalWithdrawals(professionalId: number) {
  const db = await getDb();
  if (!db) return [];
  const client = (db as any).$client;
  return new Promise<any[]>((resolve) => {
    client.execute(
      `SELECT * FROM withdrawalRequests WHERE professionalId = ? ORDER BY createdAt DESC`,
      [professionalId],
      (err: any, results: any) => {
        if (err) { console.error("[wallet] withdrawals error:", err?.message); resolve([]); }
        else resolve(Array.isArray(results) ? results : []);
      }
    );
  });
}

export async function createWithdrawalRequest(
  professionalId: number,
  amount: number,
  clabe: string
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await (db as any).$client.execute(
    `UPDATE professionalWallet
     SET balance = balance - ?, pendingWithdrawal = pendingWithdrawal + ?
     WHERE professionalId = ?`,
    [amount, amount, professionalId]
  );
  await (db as any).$client.execute(
    `INSERT INTO withdrawalRequests (professionalId, amount, clabe) VALUES (?, ?, ?)`,
    [professionalId, amount, clabe]
  );
}
