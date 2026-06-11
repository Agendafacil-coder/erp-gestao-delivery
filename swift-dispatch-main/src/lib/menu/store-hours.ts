export type StoreDaySchedule = {
  closed: boolean;
  open: string;
  close: string;
};

export type StoreOpeningHours = {
  /** Quando false, a loja aparece sempre aberta (comportamento legado). */
  enabled: boolean;
  timezone: string;
  /** Índice 0 = domingo … 6 = sábado (igual ao Date.getDay). */
  days: StoreDaySchedule[];
};

/** Ordem de exibição na UI: segunda → domingo. */
export const STORE_DAY_ORDER = [1, 2, 3, 4, 5, 6, 0] as const;

export const STORE_DAY_LABELS: Record<number, string> = {
  0: "Domingo",
  1: "Segunda",
  2: "Terça",
  3: "Quarta",
  4: "Quinta",
  5: "Sexta",
  6: "Sábado",
};

const STORE_DAY_SHORT: Record<number, string> = {
  0: "Dom",
  1: "Seg",
  2: "Ter",
  3: "Qua",
  4: "Qui",
  5: "Sex",
  6: "Sáb",
};

function defaultDaySchedule(closed = false): StoreDaySchedule {
  return { closed, open: "11:00", close: "23:00" };
}

export function createDefaultDays(): StoreDaySchedule[] {
  return Array.from({ length: 7 }, (_, index) => defaultDaySchedule(index === 0));
}

export const DEFAULT_OPENING_HOURS: StoreOpeningHours = {
  enabled: false,
  timezone: "America/Sao_Paulo",
  days: createDefaultDays(),
};

const WEEKDAY_INDEX: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

type LegacyOpeningHours = {
  enabled?: boolean;
  timezone?: string;
  weekday_open?: string;
  weekday_close?: string;
  sunday_closed?: boolean;
  sunday_open?: string;
  sunday_close?: string;
  days?: Partial<StoreDaySchedule>[];
};

function normalizeDaySchedule(raw: Partial<StoreDaySchedule> | undefined, fallback: StoreDaySchedule): StoreDaySchedule {
  return {
    closed: raw?.closed ?? fallback.closed,
    open: raw?.open?.trim() || fallback.open,
    close: raw?.close?.trim() || fallback.close,
  };
}

function migrateLegacyDays(parsed: LegacyOpeningHours): StoreDaySchedule[] {
  const weekdayOpen = parsed.weekday_open?.trim() || "11:00";
  const weekdayClose = parsed.weekday_close?.trim() || "23:00";
  const sundayClosed = parsed.sunday_closed ?? true;
  const sundayOpen = parsed.sunday_open?.trim() || "11:00";
  const sundayClose = parsed.sunday_close?.trim() || "23:00";

  return Array.from({ length: 7 }, (_, index) => {
    if (index === 0) {
      return { closed: sundayClosed, open: sundayOpen, close: sundayClose };
    }
    return { closed: false, open: weekdayOpen, close: weekdayClose };
  });
}

export function normalizeOpeningHours(hours: StoreOpeningHours): StoreOpeningHours {
  const defaults = createDefaultDays();
  const days = Array.from({ length: 7 }, (_, index) =>
    normalizeDaySchedule(hours.days?.[index], defaults[index]),
  );
  return {
    enabled: hours.enabled,
    timezone: hours.timezone?.trim() || DEFAULT_OPENING_HOURS.timezone,
    days,
  };
}

export function parseOpeningHours(raw: string | null | undefined): StoreOpeningHours {
  if (!raw?.trim()) return { ...DEFAULT_OPENING_HOURS, days: createDefaultDays() };
  try {
    const parsed = JSON.parse(raw) as LegacyOpeningHours;
    const days =
      Array.isArray(parsed.days) && parsed.days.length === 7
        ? parsed.days.map((day, index) => normalizeDaySchedule(day, createDefaultDays()[index]))
        : migrateLegacyDays(parsed);

    return normalizeOpeningHours({
      enabled: parsed.enabled ?? DEFAULT_OPENING_HOURS.enabled,
      timezone: parsed.timezone ?? DEFAULT_OPENING_HOURS.timezone,
      days,
    });
  } catch {
    return { ...DEFAULT_OPENING_HOURS, days: createDefaultDays() };
  }
}

export function parseTimeHHmm(value: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return hours * 60 + minutes;
}

function getZonedDayAndMinutes(date: Date, timeZone: string): { day: number; minutes: number } | null {
  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone,
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    const parts = formatter.formatToParts(date);
    const weekday = parts.find((p) => p.type === "weekday")?.value;
    const hour = parts.find((p) => p.type === "hour")?.value;
    const minute = parts.find((p) => p.type === "minute")?.value;
    if (!weekday || hour == null || minute == null) return null;
    const day = WEEKDAY_INDEX[weekday];
    if (day == null) return null;
    return { day, minutes: Number(hour) * 60 + Number(minute) };
  } catch {
    return null;
  }
}

function isWithinRange(nowMinutes: number, openMinutes: number, closeMinutes: number): boolean {
  if (openMinutes === closeMinutes) return false;
  if (closeMinutes > openMinutes) {
    return nowMinutes >= openMinutes && nowMinutes < closeMinutes;
  }
  return nowMinutes >= openMinutes || nowMinutes < closeMinutes;
}

/** Indica se a loja está aberta no instante informado (fuso configurado). */
export function isStoreOpenNow(hours: StoreOpeningHours, at: Date = new Date()): boolean {
  if (!hours.enabled) return true;

  const zoned = getZonedDayAndMinutes(at, hours.timezone);
  if (!zoned) return true;

  const schedule = hours.days[zoned.day];
  if (!schedule || schedule.closed) return false;

  const open = parseTimeHHmm(schedule.open);
  const close = parseTimeHHmm(schedule.close);
  if (open == null || close == null) return true;
  return isWithinRange(zoned.minutes, open, close);
}

function formatDayRangeLabel(dayIndices: number[]): string {
  if (dayIndices.length === 1) return STORE_DAY_SHORT[dayIndices[0]];

  const positions = dayIndices
    .map((day) => STORE_DAY_ORDER.indexOf(day as (typeof STORE_DAY_ORDER)[number]))
    .sort((a, b) => a - b);

  const isConsecutive = positions.every((pos, index) => index === 0 || pos === positions[index - 1] + 1);
  if (isConsecutive) {
    const first = STORE_DAY_ORDER[positions[0]];
    const last = STORE_DAY_ORDER[positions[positions.length - 1]];
    return `${STORE_DAY_SHORT[first]}–${STORE_DAY_SHORT[last]}`;
  }

  return dayIndices.map((day) => STORE_DAY_SHORT[day]).join(", ");
}

/** Texto curto para exibir no cardápio quando fechado. */
export function formatOpeningHoursSummary(hours: StoreOpeningHours): string | null {
  if (!hours.enabled) return null;

  const groups: { days: number[]; open: string; close: string }[] = [];

  for (const dayIndex of STORE_DAY_ORDER) {
    const schedule = hours.days[dayIndex];
    if (!schedule || schedule.closed) continue;

    const last = groups[groups.length - 1];
    if (last && last.open === schedule.open && last.close === schedule.close) {
      last.days.push(dayIndex);
    } else {
      groups.push({ days: [dayIndex], open: schedule.open, close: schedule.close });
    }
  }

  if (groups.length === 0) return "Fechado todos os dias";

  return groups
    .map((group) => `${formatDayRangeLabel(group.days)} ${group.open}–${group.close}`)
    .join(" · ");
}
