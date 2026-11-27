import { describe, expect, it } from "vitest";
import { bloquesDeModalidad, huecosPorModalidad } from "./appointment-utils";
import { modalidadesEfectivas, etiquetaModalidad } from "./modalidad";

// Un día de la semana siguiente, para que canScheduleAppointment deje pasar
// los huecos. Mediodía UTC: getAvailableSlots usa getDay() en la zona del
// proceso, y a mediodía el día es el mismo en cualquier zona de América.
function diaFuturo(diaSemana: number): Date {
  const d = new Date();
  d.setUTCHours(12, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() + 7);
  while (d.getUTCDay() !== diaSemana) d.setUTCDate(d.getUTCDate() + 1);
  return d;
}

describe("modalidadesEfectivas", () => {
  it("un asesor sin modalidad guardada es solo online", () => {
    expect(modalidadesEfectivas(null, true)).toEqual({ online: true, presencial: false });
  });
  it("presencial exige consultorio aprobado", () => {
    expect(modalidadesEfectivas("both", false)).toEqual({ online: true, presencial: false });
    expect(modalidadesEfectivas("in_person", false)).toEqual({ online: false, presencial: false });
    expect(modalidadesEfectivas("in_person", true)).toEqual({ online: false, presencial: true });
  });
  it("etiquetas", () => {
    expect(etiquetaModalidad({ online: true, presencial: true })).toBe("Presencial y online");
    expect(etiquetaModalidad({ online: false, presencial: true })).toBe("Presencial");
    expect(etiquetaModalidad({ online: true, presencial: false })).toBe("Online");
  });
});

describe("bloquesDeModalidad", () => {
  const bloques = [
    { dayOfWeek: 1, startTime: "09:00", endTime: "11:00", modality: "online" },
    { dayOfWeek: 1, startTime: "12:00", endTime: "14:00", modality: "in_person" },
    { dayOfWeek: 1, startTime: "15:00", endTime: "17:00", modality: "both" },
    { dayOfWeek: 1, startTime: "18:00", endTime: "19:00" }, // anterior a presencial
  ];
  it("online toma online, both y los viejos sin modalidad", () => {
    expect(bloquesDeModalidad(bloques, "online").map((b) => b.startTime)).toEqual(["09:00", "15:00", "18:00"]);
  });
  it("presencial toma in_person y both", () => {
    expect(bloquesDeModalidad(bloques, "in_person").map((b) => b.startTime)).toEqual(["12:00", "15:00"]);
  });
});

describe("huecosPorModalidad", () => {
  const lunes = diaFuturo(1);
  const bloques = [
    { dayOfWeek: 1, startTime: "09:00", endTime: "10:00", modality: "online" },
    { dayOfWeek: 1, startTime: "10:00", endTime: "11:00", modality: "in_person" },
    { dayOfWeek: 1, startTime: "11:00", endTime: "12:00", modality: "both" },
  ];
  const base = {
    clientMidnight: lunes,
    availability: bloques,
    durationMinutes: 60,
    bookedTimes: [],
    offsetMs: 0,
  };

  it("marca cada hora con sus modalidades", () => {
    const r = huecosPorModalidad({ ...base, presencialAprobado: true, filtro: "any" });
    expect(r.map((h) => [h.startTime, h.modalities.sort().join("+")])).toEqual([
      ["09:00", "online"],
      ["10:00", "in_person"],
      ["11:00", "in_person+online"],
    ]);
  });

  it("sin consultorio aprobado no ofrece presencial", () => {
    const r = huecosPorModalidad({ ...base, presencialAprobado: false, filtro: "any" });
    expect(r.map((h) => h.startTime)).toEqual(["09:00", "11:00"]);
    expect(r.every((h) => h.modalities.join() === "online")).toBe(true);
  });

  it("el filtro presencial deja solo lo presencial", () => {
    const r = huecosPorModalidad({ ...base, presencialAprobado: true, filtro: "in_person" });
    expect(r.map((h) => h.startTime)).toEqual(["10:00", "11:00"]);
  });

  it("un asesor solo presencial no ofrece online aunque el bloque lo diga", () => {
    const r = huecosPorModalidad({ ...base, permiteOnline: false, presencialAprobado: true, filtro: "any" });
    expect(r.map((h) => h.startTime)).toEqual(["10:00", "11:00"]);
  });

  it("una hora ya apartada no se ofrece en ninguna modalidad", () => {
    const ocupada = new Date(lunes);
    ocupada.setUTCHours(11, 0, 0, 0);
    const r = huecosPorModalidad({ ...base, bookedTimes: [ocupada], presencialAprobado: true, filtro: "any" });
    expect(r.map((h) => h.startTime)).toEqual(["09:00", "10:00"]);
  });
});
