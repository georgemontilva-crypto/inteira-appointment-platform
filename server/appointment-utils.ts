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
}

/**
 * Check if an appointment can be scheduled (10 minutes minimum anticipation)
 */
export function canScheduleAppointment(appointmentDate: Date, clientOffsetMinutes: number = 0): boolean {
  const nowUTC = Date.now();
  const minTimeUTC = nowUTC + 10 * 60 * 1000;
  // Convertir el slot (que está en hora local del cliente) a UTC
  const appointmentUTC = appointmentDate.getTime() - (clientOffsetMinutes * 60 * 1000);
  return appointmentUTC > minTimeUTC;
}

/**
 * Get available time slots for a professional on a specific date
 */
export function getAvailableSlots(
  date: Date,
  availabilitySchedule: AvailabilitySlot[],
  durationMinutes: number,
  bookedAppointments: Date[] = [],
  clientOffsetMinutes: number = 0
): TimeSlot[] {
  const dayOfWeek = date.getDay();
  const daySchedules = availabilitySchedule.filter(
    (slot) => slot.dayOfWeek === dayOfWeek
  );

  if (!daySchedules.length) {
    return [];
  }

  const slots: TimeSlot[] = [];

  // Extract date components in UTC so that setHours-style construction is
  // timezone-agnostic. Railway runs in UTC; professional availability is stored
  // in local Mexican time (UTC-6). Using Date.UTC keeps both sides consistent.
  const utcYear  = date.getUTCFullYear();
  const utcMonth = date.getUTCMonth();
  const utcDay   = date.getUTCDate();

  for (const daySchedule of daySchedules) {
    const [startHour, startMinute] = daySchedule.startTime.split(":").map(Number);
    const [endHour, endMinute] = daySchedule.endTime.split(":").map(Number);

    let currentTime = new Date(Date.UTC(utcYear, utcMonth, utcDay, startHour, startMinute, 0));
    const endTime   = new Date(Date.UTC(utcYear, utcMonth, utcDay, endHour,   endMinute,   0));

    while (currentTime.getTime() + durationMinutes * 60 * 1000 <= endTime.getTime()) {
      const slotEnd = new Date(currentTime.getTime() + durationMinutes * 60 * 1000);

      // Check if slot is available (not booked and respects anticipation minimum)
      const isAvailable =
        !isSlotBooked(currentTime, slotEnd, bookedAppointments, durationMinutes + 30) &&
        canScheduleAppointment(currentTime, clientOffsetMinutes);

      if (isAvailable) {
        slots.push({
          date: new Date(currentTime),
          startTime: formatTime(currentTime),
          endTime: formatTime(slotEnd),
        });
      }

      currentTime = new Date(currentTime.getTime() + (durationMinutes + 30) * 60 * 1000); // session + 30 min buffer
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
 * Format time as HH:MM
 */
function formatTime(date: Date): string {
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
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
  availabilitySchedule: AvailabilitySlot[]
): boolean {
  const dayOfWeek = appointmentTime.getDay();
  const daySchedule = availabilitySchedule.find(
    (slot) => slot.dayOfWeek === dayOfWeek
  );

  if (!daySchedule) {
    return false;
  }

  const [startHour, startMinute] = daySchedule.startTime.split(":").map(Number);
  const [endHour, endMinute] = daySchedule.endTime.split(":").map(Number);

  // Use Date.UTC to stay consistent with getAvailableSlots — avoids server-TZ drift
  const utcYear  = appointmentTime.getUTCFullYear();
  const utcMonth = appointmentTime.getUTCMonth();
  const utcDay   = appointmentTime.getUTCDate();

  const dayStart = new Date(Date.UTC(utcYear, utcMonth, utcDay, startHour, startMinute, 0));
  const dayEnd   = new Date(Date.UTC(utcYear, utcMonth, utcDay, endHour,   endMinute,   0));

  const appointmentEnd = calculateEndTime(appointmentTime, durationMinutes);

  return (
    appointmentTime >= dayStart &&
    appointmentEnd <= dayEnd &&
    canScheduleAppointment(appointmentTime)
  );
}
