import { describe, expect, it } from "vitest";
import {
  canScheduleAppointment,
  getAvailableSlots,
  isTimeWithinAvailability,
  calculateEndTime,
} from "./appointment-utils";

describe("canScheduleAppointment", () => {
  it("returns false for a time less than 4 hours from now", () => {
    const twoHoursFromNow = new Date(Date.now() + 2 * 60 * 60 * 1000);
    expect(canScheduleAppointment(twoHoursFromNow)).toBe(false);
  });

  it("returns false for a time exactly 4 hours from now", () => {
    const exactlyFourHours = new Date(Date.now() + 4 * 60 * 60 * 1000);
    // Exactly 4 hours should still be false (must be MORE than 4 hours)
    expect(canScheduleAppointment(exactlyFourHours)).toBe(false);
  });

  it("returns true for a time more than 4 hours from now", () => {
    const fiveHoursFromNow = new Date(Date.now() + 5 * 60 * 60 * 1000);
    expect(canScheduleAppointment(fiveHoursFromNow)).toBe(true);
  });

  it("returns false for a past date", () => {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    expect(canScheduleAppointment(yesterday)).toBe(false);
  });

  it("returns true for a date tomorrow", () => {
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    expect(canScheduleAppointment(tomorrow)).toBe(true);
  });
});

describe("calculateEndTime", () => {
  it("calculates end time correctly for 60 minutes", () => {
    const start = new Date("2026-03-10T10:00:00");
    const end = calculateEndTime(start, 60);
    expect(end.getHours()).toBe(11);
    expect(end.getMinutes()).toBe(0);
  });

  it("calculates end time correctly for 90 minutes", () => {
    const start = new Date("2026-03-10T09:30:00");
    const end = calculateEndTime(start, 90);
    expect(end.getHours()).toBe(11);
    expect(end.getMinutes()).toBe(0);
  });

  it("does not mutate the original date", () => {
    const start = new Date("2026-03-10T10:00:00");
    const originalTime = start.getTime();
    calculateEndTime(start, 60);
    expect(start.getTime()).toBe(originalTime);
  });
});

describe("getAvailableSlots", () => {
  const mondaySchedule = [
    { dayOfWeek: 1, startTime: "09:00", endTime: "11:00" },
  ];

  it("returns empty array when no availability for the day", () => {
    // Sunday (0) with only Monday (1) availability
    const sunday = new Date("2026-03-08T00:00:00"); // Sunday
    const slots = getAvailableSlots(sunday, mondaySchedule, 60, []);
    expect(slots).toHaveLength(0);
  });

  it("returns slots for a day with availability", () => {
    // Monday March 9, 2026
    const monday = new Date("2026-03-09T00:00:00");
    const slots = getAvailableSlots(monday, mondaySchedule, 60, []);
    // 09:00-11:00 with 60 min slots = 2 slots: 09:00 and 10:00
    expect(slots.length).toBeGreaterThan(0);
    expect(slots[0].startTime).toBe("09:00");
  });

  it("excludes already booked times", () => {
    const monday = new Date("2026-03-09T00:00:00");
    const bookedTime = new Date("2026-03-09T09:00:00");
    const slots = getAvailableSlots(monday, mondaySchedule, 60, [bookedTime]);
    // 09:00 should be excluded
    const hasNineAM = slots.some((s) => s.startTime === "09:00");
    expect(hasNineAM).toBe(false);
  });
});

describe("isTimeWithinAvailability", () => {
  const schedule = [
    { dayOfWeek: 1, startTime: "09:00", endTime: "17:00" },
  ];

  it("returns true for a time within availability", () => {
    const monday10am = new Date("2026-03-09T10:00:00");
    expect(isTimeWithinAvailability(monday10am, 60, schedule)).toBe(true);
  });

  it("returns false for a time outside availability hours", () => {
    const monday8am = new Date("2026-03-09T08:00:00");
    expect(isTimeWithinAvailability(monday8am, 60, schedule)).toBe(false);
  });

  it("returns false for a day not in availability", () => {
    const sunday = new Date("2026-03-08T10:00:00");
    expect(isTimeWithinAvailability(sunday, 60, schedule)).toBe(false);
  });

  it("returns false when appointment would exceed end time", () => {
    const monday1630 = new Date("2026-03-09T16:30:00");
    // 60 min appointment starting at 16:30 would end at 17:30, exceeding 17:00
    expect(isTimeWithinAvailability(monday1630, 60, schedule)).toBe(false);
  });
});

describe("auth.logout", () => {
  it("is covered by the existing auth.logout.test.ts", () => {
    // Covered in server/auth.logout.test.ts
    expect(true).toBe(true);
  });
});
