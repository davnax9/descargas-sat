
export const LICENSE_TIME_ZONE = "America/Mazatlan";
export const LICENSE_GRACE_DAYS = 5;

export type LicenseStatus =
  | "ACTIVE"
  | "GRACE_PERIOD"
  | "EXPIRED"
  | "DISABLED";

type LicenseData = {
  isAdmin: boolean;
  isActive: boolean;
  expiresAt: Date | null;
};

function getDateParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: LICENSE_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const values = Object.fromEntries(
    parts.map((part) => [part.type, part.value])
  );

  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
  };
}

/**
 * Convierte una fecha/hora de Mazatlán a un instante UTC.
 */
function zonedDateTimeToUtc(
  year: number,
  month: number,
  day: number,
  hour = 0,
  minute = 0,
  second = 0,
  millisecond = 0
) {
  const target = Date.UTC(
    year,
    month - 1,
    day,
    hour,
    minute,
    second,
    millisecond
  );

  let guess = target;

  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: LICENSE_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });

  for (let i = 0; i < 3; i++) {
    const parts = formatter.formatToParts(new Date(guess));

    const values = Object.fromEntries(
      parts.map((part) => [part.type, Number(part.value)])
    );

    const represented = Date.UTC(
      values.year,
      values.month - 1,
      values.day,
      values.hour,
      values.minute,
      values.second
    );

    guess += target - represented;
  }

  return new Date(guess);
}

/**
 * Devuelve el inicio del día siguiente al seleccionado.
 * Por tanto, la fecha elegida permanece activa todo ese día.
 */
export function getExpirationFromDate(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  const [year, month, day] = value.split("-").map(Number);

  const selectedDate = new Date(
    Date.UTC(year, month - 1, day)
  );

  if (selectedDate.toISOString().slice(0, 10) !== value) {
    return null;
  }

  selectedDate.setUTCDate(selectedDate.getUTCDate() + 1);

  return zonedDateTimeToUtc(
    selectedDate.getUTCFullYear(),
    selectedDate.getUTCMonth() + 1,
    selectedDate.getUTCDate()
  );
}

export function getGraceEndAt(expiresAt: Date): Date {
  const parts = getDateParts(expiresAt);

  const graceEndDate = new Date(
    Date.UTC(parts.year, parts.month - 1, parts.day)
  );

  graceEndDate.setUTCDate(
    graceEndDate.getUTCDate() + LICENSE_GRACE_DAYS
  );

  return zonedDateTimeToUtc(
    graceEndDate.getUTCFullYear(),
    graceEndDate.getUTCMonth() + 1,
    graceEndDate.getUTCDate()
  );
}

export function getLicenseStatus(
  license: LicenseData,
  now: Date = new Date()
): LicenseStatus {
  if (!license.isActive) return "DISABLED";
  if (license.isAdmin) return "ACTIVE";
  if (!license.expiresAt) return "EXPIRED";

  if (now.getTime() < license.expiresAt.getTime()) {
    return "ACTIVE";
  }

  const graceEndsAt = getGraceEndAt(license.expiresAt);

  if (now.getTime() < graceEndsAt.getTime()) {
    return "GRACE_PERIOD";
  }

  return "EXPIRED";
}

export function getGraceDaysRemaining(
  expiresAt: Date,
  now: Date = new Date()
): number {
  const graceEndsAt = getGraceEndAt(expiresAt);

  return Math.max(
    0,
    Math.ceil(
      (graceEndsAt.getTime() - now.getTime()) /
        (24 * 60 * 60 * 1000)
    )
  );
}
