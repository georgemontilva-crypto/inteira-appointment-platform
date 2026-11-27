/**
 * Qué modalidades ofrece de verdad un asesor.
 *
 * Lo que declaró (sessionModality) no basta: lo presencial además exige un
 * consultorio aprobado. Los asesores anteriores a lo presencial no tienen
 * modalidad guardada y se tratan como solo online, que es como funcionaban.
 */
export type ModalidadDeclarada = "online" | "in_person" | "both" | null | undefined;

export function modalidadesEfectivas(
  declarada: ModalidadDeclarada,
  consultorioAprobado: boolean
): { online: boolean; presencial: boolean } {
  const m = declarada ?? "online";
  return {
    online: m === "online" || m === "both",
    presencial: consultorioAprobado && (m === "in_person" || m === "both"),
  };
}

/** Etiqueta que ve el cliente en el perfil y en las listas. */
export function etiquetaModalidad(e: { online: boolean; presencial: boolean }): string {
  if (e.online && e.presencial) return "Presencial y online";
  if (e.presencial) return "Presencial";
  return "Online";
}
