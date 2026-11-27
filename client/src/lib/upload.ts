/**
 * Subida de archivos al almacenamiento (R2) a través del servidor.
 *
 * Compartido por el registro de asesor y el panel: los dos suben fotos y
 * documentos al mismo endpoint, con los mismos límites y mensajes de error.
 */
/** Límites que aplica el servidor, repetidos aquí para avisar antes de subir. */
export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
export const MAX_DOC_BYTES = 10 * 1024 * 1024;

const prettySize = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(1)} MB`;

export async function uploadFile(file: File): Promise<string> {
  const base64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string | null;
      const payload = result?.split(",")[1];
      if (!payload) {
        reject(new Error(`No se pudo leer «${file.name}». Intenta con otro archivo.`));
        return;
      }
      resolve(payload);
    };
    // onerror recibe un evento, no un Error: sin esto el fallo llegaba sin
    // mensaje y el formulario mostraba un texto generico que no decia nada.
    reader.onerror = () =>
      reject(new Error(`No se pudo leer «${file.name}». Puede estar daniado o bloqueado.`));
    reader.readAsDataURL(file);
  });

  let res: Response;
  try {
    res = await fetch("/api/upload/professional-photo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ base64, mimeType: file.type, fileName: file.name }),
    });
  } catch {
    throw new Error(
      `Se perdió la conexión al subir «${file.name}». Revisa tu internet e inténtalo de nuevo.`
    );
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({} as any));
    const detalle = (err as any).error;
    if (detalle) throw new Error(`«${file.name}»: ${detalle}`);
    if (res.status === 413) {
      throw new Error(`«${file.name}» pesa demasiado (${prettySize(file.size)}).`);
    }
    throw new Error(`No se pudo subir «${file.name}» (error ${res.status}).`);
  }
  const data = await res.json();
  return data.url as string;
}

