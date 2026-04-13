import { getDb } from "./db";

// Platform commission rates by tier
export const PROFESSIONAL_COMMISSIONS: Record<"basic" | "pro", number> = {
  basic: 0.20, // 20% platform fee — professional earns 80%
  pro:   0.15, // 15% platform fee — professional earns 85%
};

// Gross session amounts in MXN — must match credit costs in SESSION_TYPES
export const GROSS_AMOUNT_BASIC   = 350;
export const GROSS_AMOUNT_PREMIUM = 1500;

export async function creditProfessionalEarning(
  professionalId: number,
  appointmentId: number,
  tier: "basic" | "pro",
  sessionType: "basic" | "premium" = "basic"
): Promise<{ netAmount: number; commissionAmount: number }> {
  const db = await getDb();
  if (!db) throw new Error("DB not available");

  const commissionRate = PROFESSIONAL_COMMISSIONS[tier];
  const grossAmount = sessionType === "premium" ? GROSS_AMOUNT_PREMIUM : GROSS_AMOUNT_BASIC;
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

  const exec = (sql: string, params: any[] = []) =>
    new Promise<any>((resolve, reject) => {
      client.execute(sql, params, (err: any, results: any) => {
        if (err) reject(err); else resolve(results);
      });
    });

  // Ensure a wallet row always exists — create with zeros if missing
  await exec(
    `INSERT IGNORE INTO professionalWallet (professionalId, balance, pendingWithdrawal, totalEarned, totalWithdrawn)
     VALUES (?, 0, 0, 0, 0)`,
    [professionalId]
  );

  const rows = await exec(
    "SELECT * FROM professionalWallet WHERE professionalId = ? LIMIT 1",
    [professionalId]
  );
  return Array.isArray(rows) ? rows[0] ?? null : null;
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
  clabe: string | null,
  paymentMethod?: string,
  paymentDetails?: string,
  notes?: string,
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const client = (db as any).$client;

  // Insert the withdrawal request
  await new Promise<void>((resolve, reject) => {
    client.execute(
      `INSERT INTO withdrawalRequests (professionalId, amount, clabe, paymentMethod, paymentDetails, notes, status, requestedAt)
       VALUES (?, ?, ?, ?, ?, ?, 'pending', NOW())`,
      [professionalId, amount, clabe ?? null, paymentMethod ?? null, paymentDetails ?? null, notes ?? null],
      (err: any) => { if (err) reject(err); else resolve(); }
    );
  });

  // Reflect the pending amount in the wallet so the UI can show it
  await new Promise<void>((resolve, reject) => {
    client.execute(
      `UPDATE professionalWallet SET pendingWithdrawal = pendingWithdrawal + ? WHERE professionalId = ?`,
      [amount, professionalId],
      (err: any) => { if (err) reject(err); else resolve(); }
    );
  });
}

export async function approveWithdrawalRequest(withdrawalId: number, paymentProof?: string): Promise<{ professionalId: number; amount: number }> {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const client = (db as any).$client;

  const exec = (sql: string, params: any[] = []) =>
    new Promise<any>((resolve, reject) => {
      client.execute(sql, params, (err: any, results: any) => {
        if (err) reject(err); else resolve(results);
      });
    });

  // Read row before opening transaction
  const row = await exec(
    "SELECT id, professionalId, amount, status FROM withdrawalRequests WHERE id = ? LIMIT 1",
    [withdrawalId]
  ).then((r: any) => (Array.isArray(r) ? r[0] ?? null : null));

  if (!row) throw new Error("Withdrawal request not found");
  if (row.status !== "pending") throw new Error(`Withdrawal already ${row.status}`);

  const amount = parseFloat(row.amount);

  // Guard against concurrent approval: only update if still pending
  const updateResult = await exec(
    `UPDATE withdrawalRequests SET status='paid', processedAt=NOW(), updatedAt=NOW()${paymentProof ? ", paymentProof=?" : ""} WHERE id=? AND status='pending'`,
    paymentProof ? [paymentProof, withdrawalId] : [withdrawalId]
  );
  if ((updateResult as any)?.affectedRows === 0) {
    throw new Error("Withdrawal already processed by another request");
  }

  await exec(
    `UPDATE professionalWallet
     SET balance = GREATEST(0, balance - ?),
         totalWithdrawn = totalWithdrawn + ?,
         pendingWithdrawal = 0
     WHERE professionalId = ?`,
    [amount, amount, row.professionalId]
  );

  return { professionalId: row.professionalId, amount };
}

export async function rejectWithdrawalRequest(
  withdrawalId: number,
  adminNote?: string
): Promise<{ professionalId: number; amount: number }> {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const client = (db as any).$client;

  const exec = (sql: string, params: any[] = []) =>
    new Promise<any>((resolve, reject) => {
      client.execute(sql, params, (err: any, results: any) => {
        if (err) reject(err); else resolve(results);
      });
    });

  // Read row before opening transaction
  const row = await exec(
    "SELECT id, professionalId, amount, status FROM withdrawalRequests WHERE id = ? LIMIT 1",
    [withdrawalId]
  ).then((r: any) => (Array.isArray(r) ? r[0] ?? null : null));

  if (!row) throw new Error("Withdrawal request not found");
  if (row.status !== "pending") throw new Error(`Withdrawal already ${row.status}`);

  const amount = parseFloat(row.amount);

  // Guard against concurrent rejection/approval: only update if still pending
  const updateResult = await exec(
    "UPDATE withdrawalRequests SET status='rejected', processedAt=NOW(), updatedAt=NOW(), notes=COALESCE(CONCAT(COALESCE(notes,''), ?), notes) WHERE id=? AND status='pending'",
    [adminNote ? `\n[Admin] ${adminNote}` : "", withdrawalId]
  );
  if ((updateResult as any)?.affectedRows === 0) {
    throw new Error("Withdrawal already processed by another request");
  }

  // Wallet balance is NOT touched — the money never left.
  // Clear the pending amount since the request is no longer active.
  await exec(
    `UPDATE professionalWallet SET pendingWithdrawal = GREATEST(0, pendingWithdrawal - ?) WHERE professionalId = ?`,
    [amount, row.professionalId]
  );

  return { professionalId: row.professionalId, amount };
}
