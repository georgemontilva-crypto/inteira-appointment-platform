import { getDb } from "./db";

export async function createNotification(params: {
  userId: number;
  type: string;
  title: string;
  message: string;
  link?: string;
}): Promise<void> {
  const db = await getDb();
  if (!db) return;
  const client = (db as any).$client;
  try {
    await client.execute(
      "INSERT INTO notifications (userId, type, title, message, link) VALUES (?, ?, ?, ?, ?)",
      [params.userId, params.type, params.title, params.message, params.link ?? null]
    );
    console.log(`[Notifications] Creada notificación para userId=${params.userId}: ${params.title}`);
  } catch (e: any) {
    console.error("[Notifications] Error creando notificación:", e?.message);
    throw e; // relanzar para que el caller sepa que falló
  }
}

export async function getUnreadNotifications(userId: number) {
  const db = await getDb();
  if (!db) return [];
  const client = (db as any).$client;
  const result = await client.execute(
    "SELECT * FROM notifications WHERE userId=? ORDER BY createdAt DESC LIMIT 50",
    [userId]
  ) as any;
  const rows = Array.isArray(result) ? result[0] : [];
  return Array.isArray(rows) ? rows : [];
}

export async function markAllRead(userId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  const client = (db as any).$client;
  await client.execute(
    "UPDATE notifications SET isRead=1 WHERE userId=?",
    [userId]
  );
}

export async function markOneRead(id: number, userId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  const client = (db as any).$client;
  await client.execute(
    "UPDATE notifications SET isRead=1 WHERE id=? AND userId=?",
    [id, userId]
  );
}

export async function getUnreadCount(userId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const client = (db as any).$client;
  const result = await client.execute(
    "SELECT COUNT(*) as count FROM notifications WHERE userId=? AND isRead=0",
    [userId]
  ) as any;
  const rows = Array.isArray(result) ? result[0] : [];
  const arr = Array.isArray(rows) ? rows : [];
  return arr[0]?.count ?? 0;
}
