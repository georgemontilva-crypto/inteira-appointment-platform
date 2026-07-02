import { getDb } from "./db";

export async function createNotification({
  userId,
  type,
  title,
  message,
  link,
  audience = "user",
}: {
  userId: number;
  type: string;
  title: string;
  message: string;
  link?: string;
  audience?: "user" | "professional" | "all";
}): Promise<void> {
  const db = await getDb();
  if (!db) return;
  const client = (db as any).$client;
  try {
    await new Promise<void>((resolve, reject) => {
      client.execute(
        "INSERT INTO notifications (userId, type, title, message, link, audience) VALUES (?, ?, ?, ?, ?, ?)",
        [userId, type, title, message, link ?? null, audience],
        (err: any) => { if (err) return reject(err); resolve(); }
      );
    });
    console.log(`[Notifications] Creada notificación para userId=${userId}: ${title}`);
  } catch (e: any) {
    console.error("[Notifications] Error creando notificación:", e?.message);
    throw e;
  }
}

export async function getUnreadNotifications(
  userId: number,
  audience: "user" | "professional" | "all" = "user"
) {
  const db = await getDb();
  if (!db) return [];
  const client = (db as any).$client;
  return await new Promise<any[]>((resolve, reject) => {
    client.execute(
      "SELECT * FROM notifications WHERE userId = ? AND (audience = ? OR audience = 'all') ORDER BY createdAt DESC LIMIT 50",
      [userId, audience],
      (err: any, results: any) => {
        if (err) return reject(err);
        resolve(Array.isArray(results) ? results : []);
      }
    );
  });
}

export async function markAllRead(userId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  const client = (db as any).$client;
  await new Promise<void>((resolve, reject) => {
    client.execute(
      "UPDATE notifications SET isRead=1 WHERE userId=?",
      [userId],
      (err: any) => { if (err) return reject(err); resolve(); }
    );
  });
}

export async function markOneRead(id: number, userId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  const client = (db as any).$client;
  await new Promise<void>((resolve, reject) => {
    client.execute(
      "UPDATE notifications SET isRead=1 WHERE id=? AND userId=?",
      [id, userId],
      (err: any) => { if (err) return reject(err); resolve(); }
    );
  });
}

export async function getUnreadCount(
  userId: number,
  audience: "user" | "professional" | "all" = "user"
): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const client = (db as any).$client;
  const rows = await new Promise<any[]>((resolve, reject) => {
    client.execute(
      "SELECT COUNT(*) as count FROM notifications WHERE userId = ? AND isRead = 0 AND (audience = ? OR audience = 'all')",
      [userId, audience],
      (err: any, results: any) => {
        if (err) return reject(err);
        resolve(Array.isArray(results) ? results : []);
      }
    );
  });
  return rows[0]?.count ?? 0;
}
