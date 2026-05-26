// server/videocall.ts
// Video calls via Daily.co — reemplaza Google Meet y Zoom

const DAILY_API_KEY = process.env.DAILY_API_KEY!;
const DAILY_BASE_URL = 'https://api.daily.co/v1';

export interface VideoCallResult {
  url: string;
  provider: 'daily';
  roomName: string;
}

/**
 * Crea un room en Daily.co para una cita específica.
 * El room expira 1 hora después del fin de la cita.
 */
export async function generateVideoCallLink(
  appointmentId: number,
  startTime: Date,
  endTime: Date
): Promise<VideoCallResult> {
  const roomName = `cita-${appointmentId}-${Date.now()}`;

  // Expira 3 horas después del fin de la cita
  const exp = Math.floor(endTime.getTime() / 1000) + 3 * 3600;

  try {
    const response = await fetch(`${DAILY_BASE_URL}/rooms`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${DAILY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: roomName,
        properties: {
          exp,
          nbf: Math.floor(startTime.getTime() / 1000) - (5 * 60),
          enable_chat: true,
          enable_people_ui: true,
          start_video_off: false,
          start_audio_off: false,
          lang: 'es',
        },
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('[Daily] Error creating room:', error);
      throw new Error(`Daily API error: ${JSON.stringify(error)}`);
    }

    const room = await response.json();
    console.log(`[Daily] Room created: ${room.url}`);

    return {
      url: room.url,
      provider: 'daily',
      roomName: room.name,
    };
  } catch (err) {
    console.error('[Daily] Failed to create room:', err);
    // Fallback: link directo al subdominio con nombre aleatorio
    const fallbackUrl = `https://inteira.daily.co/${roomName}`;
    console.warn(`[Daily] Using fallback URL: ${fallbackUrl}`);
    return {
      url: fallbackUrl,
      provider: 'daily',
      roomName,
    };
  }
}

/**
 * Elimina un room de Daily.co (usar en cancelaciones).
 */
export async function deleteVideoCallRoom(roomName: string): Promise<void> {
  try {
    const response = await fetch(`${DAILY_BASE_URL}/rooms/${roomName}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${DAILY_API_KEY}`,
      },
    });
    if (response.ok) {
      console.log(`[Daily] Room deleted: ${roomName}`);
    }
  } catch (err) {
    console.error('[Daily] Failed to delete room:', err);
    // No lanzar error — la cancelación debe completarse igual
  }
}
