/**
 * Email service for automatic notifications
 * Uses Resend API (or fallback to console logging in dev)
 */

import { readFileSync } from "fs";
import { join } from "path";

let LOGO_BASE64 = "";
try {
  const logoBuffer = readFileSync(join(process.cwd(), "dist", "public", "logo-horizontal.png"));
  LOGO_BASE64 = `data:image/png;base64,${logoBuffer.toString("base64")}`;
} catch {
  LOGO_BASE64 = "";
}

export interface EmailData {
  to: string;
  subject: string;
  html: string;
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
        from: FROM_EMAIL,
        to: data.to,
        subject: data.subject,
        html: data.html,
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
        .btn { display: inline-block; background: #607562; color: white; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; font-size: 13px; margin: 20px 0; }
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
            ${LOGO_BASE64
              ? `<img src="${LOGO_BASE64}" alt="Inteira" style="height:38px; width:auto; object-fit:contain;">`
              : `<span style="color:white; font-size:24px; font-weight:600;">Inteira</span>`
            }
          </div>
          <div class="body">
            ${content}
          </div>
          <div class="footer">
            <p>© 2026 Inteira. Todos los derechos reservados.</p>
            <p style="margin-top:8px;"><a href="https://inteira.mx">inteira.mx</a> · <a href="https://inteira.mx/privacidad">Privacidad</a> · <a href="https://inteira.mx/terminos">Términos</a></p>
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
      <p>Ya puedes configurar tu disponibilidad horaria y comenzar a recibir citas. Inicia sesión en tu panel de profesional para completar tu perfil.</p>
      <a href="https://inteira.mx" class="btn">Ir a mi panel</a>
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

// 4. Appointment cancellation
export async function sendAppointmentCancellation(params: {
  userEmail: string;
  userName: string;
  professionalName: string;
  appointmentDate: Date;
  canceledBy: string;
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

  const content = `
    <p>Hola <strong>${params.userName}</strong>,</p>
    <p>Tu cita ha sido <strong style="color:#EF4444;">cancelada</strong>.</p>
    <div class="info-box">
      <p><strong>Especialista:</strong> ${params.professionalName}</p>
      <p><strong>Fecha:</strong> ${dateStr} a las ${timeStr}</p>
      <p><strong>Cancelada por:</strong> ${params.canceledBy}</p>
    </div>
    <p>Puedes agendar una nueva cita cuando lo desees desde tu panel de usuario.</p>
    <a href="https://inteira.mx" class="btn">Agendar nueva cita</a>
  `;

  return sendEmail({
    to: params.userEmail,
    subject: `❌ Cita cancelada con ${params.professionalName}`,
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
    <a href="https://inteira.mx" class="btn">Ver mi wallet</a>
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
    <a href="https://inteira.mx" class="btn">Ir a mi dashboard</a>
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
    <p>Tienes una nueva cita agendada. Aquí están los detalles:</p>
    <div class="info-box">
      <p><strong>Paciente:</strong> ${params.patientName}</p>
      <p><strong>Fecha:</strong> ${dateStr}</p>
      <p><strong>Hora:</strong> ${timeStr}</p>
      <p><strong>Duración:</strong> ${params.durationMinutes} minutos</p>
    </div>
    <p>Únete a la videollamada desde tu panel o usando el siguiente enlace:</p>
    <a href="${params.videoCallLink}" class="btn">Unirse a la videollamada</a>
    <div class="divider"></div>
    <p style="font-size:13px; color:#6b7280;">Recuerda estar disponible 5 minutos antes. Si necesitas cancelar, hazlo con suficiente anticipación para evitar penalizaciones.</p>
  `;

  return sendEmail({
    to: params.professionalEmail,
    subject: `📅 Nueva cita con ${params.patientName} — ${dateStr}`,
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
    <a href="https://inteira.mx" class="btn">Explorar especialistas</a>
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
    <a href="https://inteira.mx/especialidades" class="btn">Agendar una sesión</a>
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
    <a href="https://inteira.mx" class="btn">Ver panel admin</a>
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

// 11. Appointment reminder — 15 minutes before
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
    <a href="https://inteira.mx" class="btn">Revisar solicitud</a>
  `;

  return sendEmail({
    to: params.adminEmail,
    subject: "Nueva solicitud de profesional — Inteira",
    html: baseTemplate(content),
  });
}
