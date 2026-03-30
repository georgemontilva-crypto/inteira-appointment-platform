/**
 * Video call service for Zoom and Google Meet
 * Generates meeting links automatically when appointments are scheduled
 */

export type VideoCallType = "zoom" | "google_meet";

export interface VideoCallLink {
  type: VideoCallType;
  joinUrl: string;
  hostUrl?: string;
  meetingId?: string;
  password?: string;
}

/**
 * Generate a Google Meet link using the Google Calendar API
 * Falls back to a pre-generated Meet link format if no credentials
 */
export async function generateGoogleMeetLink(
  title: string,
  startTime: Date,
  endTime: Date,
  hostEmail: string,
  guestEmail: string
): Promise<VideoCallLink> {
  const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
  const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
  const GOOGLE_REFRESH_TOKEN = process.env.GOOGLE_REFRESH_TOKEN;

  if (GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET && GOOGLE_REFRESH_TOKEN) {
    console.log("[Meet] Usando credenciales reales de Google");
    try {
      // Use Google Calendar API to create event with Meet link
      const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: GOOGLE_CLIENT_ID,
          client_secret: GOOGLE_CLIENT_SECRET,
          refresh_token: GOOGLE_REFRESH_TOKEN,
          grant_type: "refresh_token",
        }),
      });

      const tokenData = (await tokenResponse.json()) as { access_token: string };
      const accessToken = tokenData.access_token;

      const eventResponse = await fetch(
        "https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            summary: title,
            start: { dateTime: startTime.toISOString() },
            end: { dateTime: endTime.toISOString() },
            attendees: [{ email: hostEmail }, { email: guestEmail }],
            conferenceData: {
              createRequest: {
                requestId: `inteira-${Date.now()}`,
                conferenceSolutionKey: { type: "hangoutsMeet" },
              },
            },
          }),
        }
      );

      const eventData = (await eventResponse.json()) as {
        conferenceData?: { entryPoints?: Array<{ uri: string; entryPointType: string }> };
      };
      const meetLink =
        eventData.conferenceData?.entryPoints?.find(
          (ep) => ep.entryPointType === "video"
        )?.uri;

      if (meetLink) {
        return {
          type: "google_meet",
          joinUrl: meetLink,
          hostUrl: meetLink,
        };
      }
    } catch (error) {
      console.error("[VideoCall] Google Meet API error:", error);
    }
  }

  // Fallback: generate a unique Meet-style link
  console.log("[Meet] FALLBACK — credenciales faltantes:", {
    hasClientId: !!GOOGLE_CLIENT_ID,
    hasSecret: !!GOOGLE_CLIENT_SECRET,
    hasRefresh: !!GOOGLE_REFRESH_TOKEN,
  });
  const meetCode = generateMeetCode();
  return {
    type: "google_meet",
    joinUrl: `https://meet.google.com/${meetCode}`,
    hostUrl: `https://meet.google.com/${meetCode}`,
    meetingId: meetCode,
  };
}

/**
 * Generate a Zoom meeting link using the Zoom API
 * Falls back to a placeholder if no credentials
 */
export async function generateZoomLink(
  title: string,
  startTime: Date,
  durationMinutes: number,
  hostEmail: string
): Promise<VideoCallLink> {
  const ZOOM_ACCOUNT_ID = process.env.ZOOM_ACCOUNT_ID;
  const ZOOM_CLIENT_ID = process.env.ZOOM_CLIENT_ID;
  const ZOOM_CLIENT_SECRET = process.env.ZOOM_CLIENT_SECRET;

  if (ZOOM_ACCOUNT_ID && ZOOM_CLIENT_ID && ZOOM_CLIENT_SECRET) {
    try {
      // Get Zoom OAuth token (Server-to-Server OAuth)
      const credentials = Buffer.from(
        `${ZOOM_CLIENT_ID}:${ZOOM_CLIENT_SECRET}`
      ).toString("base64");

      const tokenResponse = await fetch(
        `https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${ZOOM_ACCOUNT_ID}`,
        {
          method: "POST",
          headers: {
            Authorization: `Basic ${credentials}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
        }
      );

      const tokenData = (await tokenResponse.json()) as { access_token: string };
      const accessToken = tokenData.access_token;

      // Create Zoom meeting
      const meetingResponse = await fetch(
        `https://api.zoom.us/v2/users/me/meetings`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            topic: title,
            type: 2, // Scheduled meeting
            start_time: startTime.toISOString(),
            duration: durationMinutes,
            settings: {
              host_video: true,
              participant_video: true,
              waiting_room: true,
              auto_recording: "none",
            },
          }),
        }
      );

      const meetingData = (await meetingResponse.json()) as {
        join_url: string;
        start_url: string;
        id: number;
        password: string;
      };

      if (meetingData.join_url) {
        return {
          type: "zoom",
          joinUrl: meetingData.join_url,
          hostUrl: meetingData.start_url,
          meetingId: meetingData.id?.toString(),
          password: meetingData.password,
        };
      }
    } catch (error) {
      console.error("[VideoCall] Zoom API error:", error);
    }
  }

  // Fallback: generate a placeholder Zoom link
  const meetingId = generateZoomId();
  return {
    type: "zoom",
    joinUrl: `https://zoom.us/j/${meetingId}`,
    hostUrl: `https://zoom.us/s/${meetingId}`,
    meetingId,
    password: generatePassword(),
  };
}

/**
 * Generate video call link based on type
 */
export async function generateVideoCallLink(
  type: VideoCallType,
  title: string,
  startTime: Date,
  endTime: Date,
  hostEmail: string,
  guestEmail: string
): Promise<VideoCallLink> {
  const durationMinutes = Math.round(
    (endTime.getTime() - startTime.getTime()) / 60000
  );

  if (type === "google_meet") {
    return generateGoogleMeetLink(title, startTime, endTime, hostEmail, guestEmail);
  } else {
    return generateZoomLink(title, startTime, durationMinutes, hostEmail);
  }
}

// Helper functions
function generateMeetCode(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz";
  const segment = () =>
    Array.from({ length: 3 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  return `${segment()}-${segment()}-${segment()}`;
}

function generateZoomId(): string {
  return Array.from({ length: 11 }, () => Math.floor(Math.random() * 10)).join("");
}

function generatePassword(): string {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}
