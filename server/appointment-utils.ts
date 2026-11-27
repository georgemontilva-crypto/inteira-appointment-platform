/**
 * Appointment and availability utility functions
 */

export interface TimeSlot {
  date: Date;
  startTime: string;
  endTime: string;
}

export interface AvailabilitySlot {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  modality?: string | null;
}

/**
 * Check if an appointment can be scheduled (10 minutes minimum anticipation)
 */
export function canScheduleAppointment(appointmentDate: Date): boolean {
  const minTime = Date.now() + 10 * 60 * 1000; // 10 minutos de anticipación
  return appointmentDate.getTime() > minTime;
}

/**
 * Get available time slots for a professional on a specific date
 */
export type Modalidad = "online" | "in_person";

/**
 * Bloques de horario que sirven para una modalidad.
 *
 * Un bloque marcado "both" sirve para las dos; los bloques sin modalidad
 * (anteriores a la atención presencial) cuentan como online.
 */
export function bloquesDeModalidad<T extends { modality?: string | null }>(
  bloques: T[],
  modalidad: Modalidad
): T[] {
  return bloques.filter((b) => {
    const m = b.modality ?? "online";
    return m === "both" || m === modalidad;
  });
}

export function getAvailableSlots(
  date: Date,
  availabilitySchedule: AvailabilitySlot[],
  durationMinutes: number,
  bookedAppointments: Date[] = [],
  offsetMs: number = 0
): TimeSlot[] {
  const dayOfWeek = date.getDay();
  const daySchedules = availabilitySchedule.filter(
    (slot) => slot.dayOfWeek === dayOfWeek
  );

  if (!daySchedules.length) {
    return [];
  }

  const slots: TimeSlot[] = [];

  for (const daySchedule of daySchedules) {
    const [startHour, startMinute] = daySchedule.startTime.split(":").map(Number);
    const [endHour, endMinute] = daySchedule.endTime.split(":").map(Number);

    // Convert professional's local hours to UTC using client offset.
    // e.g. for UTC-6 (clientOffsetMinutes=-360): 9 - (-6) = 15 UTC = 9am Mexico ✅
    const clientOffsetMinutes = offsetMs / (60 * 1000);

    let currentTime = new Date(date);
    currentTime.setUTCHours(startHour - (clientOffsetMinutes / 60), startMinute, 0, 0);

    const endTime = new Date(date);
    endTime.setUTCHours(endHour - (clientOffsetMinutes / 60), endMinute, 0, 0);

    while (currentTime.getTime() + durationMinutes * 60 * 1000 <= endTime.getTime()) {
      const slotEnd = new Date(currentTime.getTime() + durationMinutes * 60 * 1000);

      // Check if slot is available (not booked and respects anticipation minimum)
      const isBooked = isSlotBooked(currentTime, slotEnd, bookedAppointments, durationMinutes + 10);
      const canSchedule = canScheduleAppointment(currentTime);
      const isAvailable = !isBooked && canSchedule;

      if (isAvailable) {
        slots.push({
          date: new Date(currentTime),
          startTime: formatTime(currentTime, offsetMs),
          endTime: formatTime(slotEnd, offsetMs),
        });
      }

      currentTime = new Date(currentTime.getTime() + (durationMinutes + 10) * 60 * 1000); // session + 10 min buffer
    }
  }

  return slots;
}

/**
 * Check if a time slot is booked
 */
function isSlotBooked(
  startTime: Date,
  endTime: Date,
  bookedAppointments: Date[],
  bufferMinutes: number = 90
): boolean {
  return bookedAppointments.some((appointmentTime) => {
    const appointmentEnd = new Date(appointmentTime.getTime() + bufferMinutes * 60 * 1000);
    return (
      (startTime >= appointmentTime && startTime < appointmentEnd) ||
      (endTime > appointmentTime && endTime <= appointmentEnd) ||
      (startTime <= appointmentTime && endTime >= appointmentEnd)
    );
  });
}

/**
 * Format time as HH:MM in the client's local timezone.
 * Slots are stored in UTC; offsetMs converts them back to local time.
 */
function formatTime(date: Date, offsetMs: number = 0): string {
  const localDate = new Date(date.getTime() + offsetMs);
  const hours = String(localDate.getUTCHours()).padStart(2, "0");
  const minutes = String(localDate.getUTCMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

/**
 * Get next available appointment date for a professional
 */
export function getNextAvailableDate(
  availabilitySchedule: AvailabilitySlot[],
  startFromDate: Date = new Date()
): Date | null {
  const maxDaysToCheck = 30;
  let currentDate = new Date(startFromDate);

  for (let i = 0; i < maxDaysToCheck; i++) {
    const dayOfWeek = currentDate.getDay();
    const hasAvailability = availabilitySchedule.some(
      (slot) => slot.dayOfWeek === dayOfWeek
    );

    if (hasAvailability && canScheduleAppointment(currentDate)) {
      return new Date(currentDate);
    }

    currentDate.setDate(currentDate.getDate() + 1);
  }

  return null;
}

/**
 * Calculate appointment end time
 */
export function calculateEndTime(
  startTime: Date,
  durationMinutes: number
): Date {
  return new Date(startTime.getTime() + durationMinutes * 60 * 1000);
}

/**
 * Check if appointment time is within professional's availability
 */
export function isTimeWithinAvailability(
  appointmentTime: Date,
  durationMinutes: number,
  availabilitySchedule: AvailabilitySlot[],
  offsetMs: number = 0
): boolean {
  const dayOfWeek = appointmentTime.getDay();
  const appointmentEnd = calculateEndTime(appointmentTime, durationMinutes);
  const clientOffsetMinutes = offsetMs / (60 * 1000);

  const fitsInAnyBlock = availabilitySchedule
    .filter((slot) => slot.dayOfWeek === dayOfWeek)
    .some((daySchedule) => {
      const [startHour, startMinute] = daySchedule.startTime.split(":").map(Number);
      const [endHour, endMinute] = daySchedule.endTime.split(":").map(Number);

      const dayStart = new Date(appointmentTime);
      dayStart.setUTCHours(startHour - (clientOffsetMinutes / 60), startMinute, 0, 0);

      const dayEnd = new Date(appointmentTime);
      dayEnd.setUTCHours(endHour - (clientOffsetMinutes / 60), endMinute, 0, 0);

      return appointmentTime >= dayStart && appointmentEnd <= dayEnd;
    });

  return fitsInAnyBlock && canScheduleAppointment(appointmentTime);
}

export type FiltroModalidad = "any" | Modalidad;

/**
 * Huecos libres de un asesor en un día, con la modalidad en que se puede
 * atender cada uno.
 *
 * Se calculan por separado los huecos de los bloques online y los de los
 * bloques presenciales (solo si el consultorio está aprobado) y se juntan por
 * hora: un mismo horario puede ofrecerse en las dos modalidades.
 */
export function huecosPorModalidad(params: {
  clientMidnight: Date;
  availability: any[];
  durationMinutes: number;
  bookedTimes: any[];
  offsetMs: number;
  /** Puede atender online (según la modalidad que declaró) */
  permiteOnline?: boolean;
  /** Declaró presencial y tiene consultorio aprobado */
  presencialAprobado: boolean;
  filtro: FiltroModalidad;
}): { startTime: string; endTime: string; date: Date; modalities: Modalidad[] }[] {
  const { clientMidnight, availability, durationMinutes, bookedTimes, offsetMs } = params;
  const porHora = new Map<string, { startTime: string; endTime: string; date: Date; modalities: Modalidad[] }>();

  const agregar = (modalidad: Modalidad) => {
    const huecos = getAvailableSlots(
      clientMidnight,
      bloquesDeModalidad(availability, modalidad),
      durationMinutes,
      bookedTimes,
      offsetMs
    );
    for (const h of huecos) {
      const previo = porHora.get(h.startTime);
      if (previo) {
        if (!previo.modalities.includes(modalidad)) previo.modalities.push(modalidad);
      } else {
        porHora.set(h.startTime, { ...h, modalities: [modalidad] });
      }
    }
  };

  if (params.filtro !== "in_person" && params.permiteOnline !== false) agregar("online");
  if (params.filtro !== "online" && params.presencialAprobado) agregar("in_person");

  return Array.from(porHora.values()).sort((a, b) => a.startTime.localeCompare(b.startTime));
}
