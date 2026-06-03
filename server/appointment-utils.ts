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
export function canScheduleAppointment(appointmentDate: Date): boolean {
  const minTime = Date.now() + 10 * 60 * 1000; // 10 minutos de anticipación
  return appointmentDate.getTime() > minTime;
}

/**
 * Get available time slots for a professional on a specific date
 */
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

    console.log("[Slots] dateObj:", date.toISOString(), "first slot would be:", startHour + ":" + startMinute, "offsetMs:", offsetMs);

    let currentTime = new Date(date);
    currentTime.setHours(startHour, startMinute, 0, 0);

    const endTime = new Date(date);
    endTime.setHours(endHour, endMinute, 0, 0);

    while (currentTime.getTime() + durationMinutes * 60 * 1000 <= endTime.getTime()) {
      const slotEnd = new Date(currentTime.getTime() + durationMinutes * 60 * 1000);

      // Check if slot is available (not booked and respects anticipation minimum)
      const isAvailable =
        !isSlotBooked(currentTime, slotEnd, bookedAppointments, durationMinutes + 10) &&
        canScheduleAppointment(currentTime);

      if (isAvailable) {
        slots.push({
          date: new Date(currentTime),
          startTime: formatTime(currentTime),
          endTime: formatTime(slotEnd),
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
  const appointmentEnd = calculateEndTime(appointmentTime, durationMinutes);

  const fitsInAnyBlock = availabilitySchedule
    .filter((slot) => slot.dayOfWeek === dayOfWeek)
    .some((daySchedule) => {
      const [startHour, startMinute] = daySchedule.startTime.split(":").map(Number);
      const [endHour, endMinute] = daySchedule.endTime.split(":").map(Number);

      const dayStart = new Date(appointmentTime);
      dayStart.setHours(startHour, startMinute, 0, 0);

      const dayEnd = new Date(appointmentTime);
      dayEnd.setHours(endHour, endMinute, 0, 0);

      return appointmentTime >= dayStart && appointmentEnd <= dayEnd;
    });

  return fitsInAnyBlock && canScheduleAppointment(appointmentTime);
}
