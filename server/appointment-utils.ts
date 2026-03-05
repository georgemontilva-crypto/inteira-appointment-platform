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
 * Check if an appointment can be scheduled (4 hours minimum anticipation)
 */
export function canScheduleAppointment(appointmentDate: Date): boolean {
  const now = new Date();
  const minHours = 4;
  const minTime = new Date(now.getTime() + minHours * 60 * 60 * 1000);
  
  return appointmentDate > minTime;
}

/**
 * Get available time slots for a professional on a specific date
 */
export function getAvailableSlots(
  date: Date,
  availabilitySchedule: AvailabilitySlot[],
  durationMinutes: number,
  bookedAppointments: Date[] = []
): TimeSlot[] {
  const dayOfWeek = date.getDay();
  const daySchedule = availabilitySchedule.find(
    (slot) => slot.dayOfWeek === dayOfWeek
  );

  if (!daySchedule) {
    return [];
  }

  const slots: TimeSlot[] = [];
  const [startHour, startMinute] = daySchedule.startTime.split(":").map(Number);
  const [endHour, endMinute] = daySchedule.endTime.split(":").map(Number);

  let currentTime = new Date(date);
  currentTime.setHours(startHour, startMinute, 0, 0);

  const endTime = new Date(date);
  endTime.setHours(endHour, endMinute, 0, 0);

  while (currentTime.getTime() + durationMinutes * 60 * 1000 <= endTime.getTime()) {
    const slotEnd = new Date(currentTime.getTime() + durationMinutes * 60 * 1000);

    // Check if slot is available (not booked and respects 4-hour anticipation)
    const isAvailable =
      !isSlotBooked(currentTime, slotEnd, bookedAppointments) &&
      canScheduleAppointment(currentTime);

    if (isAvailable) {
      slots.push({
        date: new Date(currentTime),
        startTime: formatTime(currentTime),
        endTime: formatTime(slotEnd),
      });
    }

    currentTime = new Date(currentTime.getTime() + 30 * 60 * 1000); // 30-minute intervals
  }

  return slots;
}

/**
 * Check if a time slot is booked
 */
function isSlotBooked(
  startTime: Date,
  endTime: Date,
  bookedAppointments: Date[]
): boolean {
  return bookedAppointments.some((appointmentTime) => {
    const appointmentEnd = new Date(appointmentTime.getTime() + 60 * 60 * 1000); // Assuming 1 hour default
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

  const dayStart = new Date(appointmentTime);
  dayStart.setHours(startHour, startMinute, 0, 0);

  const dayEnd = new Date(appointmentTime);
  dayEnd.setHours(endHour, endMinute, 0, 0);

  const appointmentEnd = calculateEndTime(appointmentTime, durationMinutes);

  return (
    appointmentTime >= dayStart &&
    appointmentEnd <= dayEnd &&
    canScheduleAppointment(appointmentTime)
  );
}
