const TURKISH_MONTHS = [
  "Ocak",
  "Şubat",
  "Mart",
  "Nisan",
  "Mayıs",
  "Haziran",
  "Temmuz",
  "Ağustos",
  "Eylül",
  "Ekim",
  "Kasım",
  "Aralık",
];

export interface ComputedCyclePeriod {
  periodKey: string; // e.g. "2026-10"
  label: string;     // e.g. "15 Ekim - 14 Kasım 2026" or "Ekim 2026 Dönemi"
  startDate: Date;
  endDate: Date;
}

export function clampCycleDay(day: number): number {
  if (Number.isNaN(day) || day < 1) return 1;
  if (day > 28) return 28;
  return Math.floor(day);
}

/**
 * Given a reference year, monthIndex (0-11), and room cycleDay (1-28),
 * returns the exact billing period boundaries and formatted Turkish label.
 */
export function buildBillingPeriod(
  year: number,
  monthIndex: number,
  cycleDay: number
): ComputedCyclePeriod {
  const safeDay = clampCycleDay(cycleDay);
  const startDate = new Date(Date.UTC(year, monthIndex, safeDay, 0, 0, 0));

  let endDate: Date;
  let label: string;

  const startYear = startDate.getUTCFullYear();
  const startMonth = startDate.getUTCMonth();
  const periodKey = `${startYear}-${String(startMonth + 1).padStart(2, "0")}`;

  if (safeDay === 1) {
    // Full calendar month: 1 Ekim - 31 Ekim
    endDate = new Date(Date.UTC(startYear, startMonth + 1, 0, 23, 59, 59));
    const endDayNum = endDate.getUTCDate();
    label = `1 ${TURKISH_MONTHS[startMonth]} - ${endDayNum} ${TURKISH_MONTHS[startMonth]} ${startYear}`;
  } else {
    // Custom cycle: e.g., 15 Ekim - 14 Kasım
    endDate = new Date(Date.UTC(startYear, startMonth + 1, safeDay - 1, 23, 59, 59));
    const endMonth = endDate.getUTCMonth();
    const endYear = endDate.getUTCFullYear();
    const yearSuffix = startYear === endYear ? `${endYear}` : `${startYear}/${endYear}`;
    label = `${safeDay} ${TURKISH_MONTHS[startMonth]} - ${safeDay - 1} ${TURKISH_MONTHS[endMonth]} ${yearSuffix}`;
  }

  return {
    periodKey,
    label,
    startDate,
    endDate,
  };
}

/**
 * Determines which billing period is active for a given date and cycleDay.
 */
export function getActiveBillingPeriod(
  now: Date = new Date(),
  cycleDay: number = 1
): ComputedCyclePeriod {
  const safeDay = clampCycleDay(cycleDay);
  const currentDay = now.getDate();
  let targetYear = now.getFullYear();
  let targetMonth = now.getMonth();

  if (currentDay < safeDay) {
    // Still inside the cycle that started in the previous month
    targetMonth -= 1;
    if (targetMonth < 0) {
      targetMonth = 11;
      targetYear -= 1;
    }
  }

  return buildBillingPeriod(targetYear, targetMonth, safeDay);
}

/**
 * Generates a list of historical periods (up to `monthsBack` months prior)
 * so the user can easily pick any past month to manually enter expenses.
 */
export function getSelectableHistoricalPeriods(
  cycleDay: number = 1,
  monthsBack: number = 12,
  referenceDate: Date = new Date()
): ComputedCyclePeriod[] {
  const active = getActiveBillingPeriod(referenceDate, cycleDay);
  const [activeYearStr, activeMonthStr] = active.periodKey.split("-");
  const baseYear = parseInt(activeYearStr, 10);
  const baseMonthIndex = parseInt(activeMonthStr, 10) - 1;

  const list: ComputedCyclePeriod[] = [];
  for (let offset = 0; offset <= monthsBack; offset++) {
    const d = new Date(Date.UTC(baseYear, baseMonthIndex - offset, 1));
    list.push(buildBillingPeriod(d.getUTCFullYear(), d.getUTCMonth(), cycleDay));
  }
  return list;
}

export const DEFAULT_HOUSE_CATEGORIES = [
  { name: "Kira", icon: "Home", sortOrder: 1 },
  { name: "Elektrik", icon: "Zap", sortOrder: 2 },
  { name: "Su", icon: "Droplets", sortOrder: 3 },
  { name: "Doğalgaz", icon: "Flame", sortOrder: 4 },
  { name: "İnternet", icon: "Wifi", sortOrder: 5 },
];

export const DEFAULT_DORM_CATEGORIES = [
  { name: "Oda Ortak Market/Atıştırmalık", icon: "ShoppingBag", sortOrder: 1 },
  { name: "Damacana Su", icon: "Droplets", sortOrder: 2 },
  { name: "Çamaşırhane/Kurutma", icon: "Shirt", sortOrder: 3 },
  { name: "Ortak Abonelikler", icon: "Tv", sortOrder: 4 },
];
