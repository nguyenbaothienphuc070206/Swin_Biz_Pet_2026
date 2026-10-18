export type Interval = { start: number; end: number };

export function isWithinOpeningHours(slot: Interval, opening: Interval | null, holidays: Interval[] = []) {
  if (!opening || slot.start < opening.start || slot.end > opening.end) return false;
  return !holidays.some((holiday) => slot.start < holiday.end && slot.end > holiday.start);
}

export function isVetAvailable(slot: Interval, shifts: Interval[], busy: Interval[], bufferMinutes = 0) {
  const buffered = { start: slot.start - bufferMinutes * 60_000, end: slot.end + bufferMinutes * 60_000 };
  const inShift = shifts.some((shift) => buffered.start >= shift.start && buffered.end <= shift.end);
  const overlaps = busy.some((other) => buffered.start < other.end && buffered.end > other.start);
  return inShift && !overlaps;
}

export type SlotCapacity = { capacity: number; reserved: number };
export function reserveCapacity(slot: SlotCapacity) {
  if (slot.reserved >= slot.capacity) return null;
  return { ...slot, reserved: slot.reserved + 1 };
}
