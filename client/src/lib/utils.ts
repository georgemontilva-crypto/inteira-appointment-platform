import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// mysql2 serializes DATETIME columns as ISO strings with a trailing 'Z' (UTC).
// Our appointmentDate values are stored as local-time strings with no offset,
// so stripping the 'Z' lets the browser parse them as local time instead of UTC.
export function parseLocalDate(d: string | Date): Date {
  if (d instanceof Date) return d;
  return new Date(String(d).replace("Z", "").replace(/[+-]\d{2}:\d{2}$/, ""));
}
