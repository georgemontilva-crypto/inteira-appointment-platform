// server/videocall.ts
// Video calls via Daily.co — reemplaza Google Meet y Zoom

const DAILY_API_KEY = process.env.DAILY_API_KEY!;
const DAILY_BASE_URL = 'https://api.daily.co/v1';

export interface VideoCallResult {
  url: string;
  provider: 'daily';
  roomName: string;
  /** Enlace con token de identidad para el paciente. */
  userUrl: string;
  /** Enlace con token de identidad para el profesional. */
  professionalUrl: string;
}

/**
 * Codifica el rol dentro del user_id del token. Daily nos devuelve este mismo
 * valor en los webhooks participant.joined / participant.left, y es lo que nos
 * permite saber QUIÉN estuvo en la sala sin depender de un clic en la app.
 */
export function buildParticipantId(role: 'user' | 'professional', id: number): string {
  return `${role}:${id}`;
}

export function parseParticipantId(userId: string | undefined | null):
  { role: 'user' | 'professional'; id: number } | null {
  if (!userId) return null;
  const [role, rawId] = userId.split(':');
  if (role !== 'user' && role !== 'professional') return null;
  const id = Number(rawId);
  return Number.isFinite(id) ? { role, id } : null;
}

/**
 * Crea un meeting token de Daily que identifica al participante.
 * Devuelve null si falla — el enlace sin token sigue funcionando, solo que
 * esa entrada quedará sin identificar y la cita irá a revisión manual.
 */
export async function createMeetingToken(params: {
  roomName: string;
  userId: string;
  userName: string;
  exp: number;
  isOwner?: boolean;
}): Promise<string | null> {
  try {
    const response = await fetch(`${DAILY_BASE_URL}/meeting-tokens`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${DAILY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        properties: {
          room_name: params.roomName,
          user_id: params.userId,
          user_name: params.userName,
          is_owner: params.isOwner ?? false,
          exp: params.exp,
        },
      }),
    });
    if (!response.ok) {
      console.error('[Daily] Error creating meeting token:', await response.text());
      return null;
    }
    const data = await response.json();
    return data.token ?? null;
  } catch (err) {
    console.error('[Daily] Failed to create meeting token:', err);
    return null;
  }
}

/**
 * Consulta a Daily quién estuvo realmente en una sala. Se usa como
 * reconciliación: si un webhook se perdió (deploy, caída momentánea), esto
 * lo suple al cerrar la cita.
 */
export async function fetchRoomPresence(roomName: string): Promise<
  Array<{ userId: string | null; joinedAt: Date; leftAt: Date | null }>
> {
  try {
    const response = await fetch(
      `${DAILY_BASE_URL}/meetings?room=${encodeURIComponent(roomName)}&limit=100`,
      { headers: { 'Authorization': `Bearer ${DAILY_API_KEY}` } }
    );
    if (!response.ok) {
      console.warn('[Daily] fetchRoomPresence unavailable:', response.status);
      return [];
    }
    const data = await response.json();
    const out: Array<{ userId: string | null; joinedAt: Date; leftAt: Date | null }> = [];
    for (const meeting of data.data ?? []) {
      for (const p of meeting.participants ?? []) {
        if (!p.join_time) continue;
        const joinedAt = new Date(p.join_time * 1000);
        const leftAt = p.duration != null
          ? new Date((p.join_time + p.duration) * 1000)
          : null;
        out.push({ userId: p.user_id ?? null, joinedAt, leftAt });
      }
    }
    return out;
  } catch (err) {
    console.warn('[Daily] fetchRoomPresence failed:', err);
    return [];
  }
}

/**
 * Crea un room en Daily.co para una cita específica.
 * El room expira 1 hora después del fin de la cita.
 */
export async function generateVideoCallLink(
  appointmentId: number,
  startTime: Date,
  endTime: Date,
  identities?: {
    userId: number;
    userName: string;
    professionalId: number;
    professionalName: string;
  }
): Promise<VideoCallResult> {
  const roomName = `cita-${appointmentId}-${Date.now()}`;

  // Expira 15 minutos después del fin de la cita. Antes eran 3 horas, lo que
  // dejaba la sala viva mucho después de terminar y permitía volver a entrar.
  const exp = Math.floor(endTime.getTime() / 1000) + 15 * 60;

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
          // Al expirar la sala, saca a quien siga dentro en vez de dejarlo colgado
          eject_at_room_exp: true,
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

    // Tokens de identidad: sin esto Daily no puede decirnos quién entró.
    let userUrl = room.url;
    let professionalUrl = room.url;
    if (identities) {
      const [userToken, profToken] = await Promise.all([
        createMeetingToken({
          roomName: room.name,
          userId: buildParticipantId('user', identities.userId),
          userName: identities.userName,
          exp,
        }),
        createMeetingToken({
          roomName: room.name,
          userId: buildParticipantId('professional', identities.professionalId),
          userName: identities.professionalName,
          exp,
          isOwner: true,
        }),
      ]);
      if (userToken) userUrl = `${room.url}?t=${userToken}`;
      if (profToken) professionalUrl = `${room.url}?t=${profToken}`;
    }

    return {
      url: room.url,
      provider: 'daily',
      roomName: room.name,
      userUrl,
      professionalUrl,
    };
  } catch (err) {
    console.error('[Daily] Failed to create room:', err);
    throw new Error('No se pudo crear la videollamada. Por favor intenta de nuevo.');
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
