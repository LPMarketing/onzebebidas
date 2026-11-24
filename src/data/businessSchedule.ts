export interface DaySchedule {
  dayIndex: number; // 0 = Domingo, 1 = Segunda, 2 = Terça, 3 = Quarta, 4 = Quinta, 5 = Sexta, 6 = Sábado
  dayName: string;
  dayShort: string;
  openHour: number;
  openMinute: number;
  closeHour: number;
  closeMinute: number;
  displayHours: string;
  closesNextDay: boolean;
}

export const BUSINESS_HOURS: DaySchedule[] = [
  {
    dayIndex: 0,
    dayName: 'Domingo',
    dayShort: 'DOM',
    openHour: 15,
    openMinute: 0,
    closeHour: 0,
    closeMinute: 30,
    displayHours: '15h às 00h30',
    closesNextDay: true,
  },
  {
    dayIndex: 1,
    dayName: 'Segunda-feira',
    dayShort: 'SEG',
    openHour: 16,
    openMinute: 0,
    closeHour: 0,
    closeMinute: 0,
    displayHours: '16h às 00h',
    closesNextDay: true,
  },
  {
    dayIndex: 2,
    dayName: 'Terça-feira',
    dayShort: 'TER',
    openHour: 16,
    openMinute: 0,
    closeHour: 0,
    closeMinute: 30,
    displayHours: '16h às 00h30',
    closesNextDay: true,
  },
  {
    dayIndex: 3,
    dayName: 'Quarta-feira',
    dayShort: 'QUA',
    openHour: 16,
    openMinute: 0,
    closeHour: 0,
    closeMinute: 30,
    displayHours: '16h às 00h30',
    closesNextDay: true,
  },
  {
    dayIndex: 4,
    dayName: 'Quinta-feira',
    dayShort: 'QUI',
    openHour: 16,
    openMinute: 0,
    closeHour: 0,
    closeMinute: 30,
    displayHours: '16h às 00h30',
    closesNextDay: true,
  },
  {
    dayIndex: 5,
    dayName: 'Sexta-feira',
    dayShort: 'SEX',
    openHour: 16,
    openMinute: 0,
    closeHour: 1,
    closeMinute: 0,
    displayHours: '16h às 01h',
    closesNextDay: true,
  },
  {
    dayIndex: 6,
    dayName: 'Sábado',
    dayShort: 'SÁB',
    openHour: 16,
    openMinute: 0,
    closeHour: 1,
    closeMinute: 0,
    displayHours: '16h às 01h',
    closesNextDay: true,
  },
];

export const HAPPY_HOUR_CONFIG = {
  title: 'Happy Hour Onze',
  subtitle: 'De segunda a sexta, das 16h às 20h.',
  tagline: 'Chegue mais cedo e aproveite o Happy Hour da Onze.',
  daysText: 'Segunda a Sexta',
  startHour: 16,
  startMinute: 0,
  endHour: 20,
  endMinute: 0,
  displayRange: '16h — 20h',
  startDisplay: '16h',
  endDisplay: '20h',
  activeDays: [1, 2, 3, 4, 5], // Mon-Fri
};

export interface SaoPauloTimeInfo {
  year: number;
  month: number;
  day: number;
  dayOfWeek: number; // 0 = Domingo, 1 = Segunda, ... 6 = Sábado
  hours: number;
  minutes: number;
  totalMinutes: number; // hours * 60 + minutes
}

/**
 * Returns current timestamp in America/Sao_Paulo timezone
 */
export function getSaoPauloNow(overrideDate?: Date): SaoPauloTimeInfo {
  const date = overrideDate || new Date();
  
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: false,
  });

  const parts = formatter.formatToParts(date);
  let year = 2026, month = 1, day = 1, hours = 0, minutes = 0;

  for (const p of parts) {
    if (p.type === 'year') year = parseInt(p.value, 10);
    if (p.type === 'month') month = parseInt(p.value, 10);
    if (p.type === 'day') day = parseInt(p.value, 10);
    if (p.type === 'hour') hours = parseInt(p.value, 10);
    if (p.type === 'minute') minutes = parseInt(p.value, 10);
  }

  hours = hours % 24;

  const spDateStr = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);

  const [mm, dd, yyyy] = spDateStr.split('/').map(Number);
  const d = new Date(Date.UTC(yyyy, mm - 1, dd, 12, 0, 0));
  const dayOfWeek = d.getUTCDay();

  return {
    year,
    month,
    day,
    dayOfWeek,
    hours,
    minutes,
    totalMinutes: hours * 60 + minutes,
  };
}

export type HappyHourStatusType = 'active' | 'upcoming_today' | 'closed_today' | 'weekend';

export interface HappyHourStatusResult {
  status: HappyHourStatusType;
  badgeText: string;
  isHappeningNow: boolean;
  hintText: string;
}

/**
 * Calculates current Happy Hour status in São Paulo timezone
 */
export function getHappyHourStatus(now: SaoPauloTimeInfo = getSaoPauloNow()): HappyHourStatusResult {
  const { dayOfWeek, totalMinutes } = now;
  const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5;
  const startMin = HAPPY_HOUR_CONFIG.startHour * 60 + HAPPY_HOUR_CONFIG.startMinute; // 16:00 = 960
  const endMin = HAPPY_HOUR_CONFIG.endHour * 60 + HAPPY_HOUR_CONFIG.endMinute; // 20:00 = 1200

  if (isWeekday) {
    if (totalMinutes >= startMin && totalMinutes < endMin) {
      return {
        status: 'active',
        badgeText: 'Happy Hour acontecendo agora',
        isHappeningNow: true,
        hintText: 'Aproveite até às 20h',
      };
    }

    if (totalMinutes < startMin) {
      return {
        status: 'upcoming_today',
        badgeText: 'Happy Hour hoje às 16h',
        isHappeningNow: false,
        hintText: 'De segunda a sexta, 16h às 20h',
      };
    }

    // After 20:00 on weekdays
    if (dayOfWeek === 5) {
      // Friday night
      return {
        status: 'closed_today',
        badgeText: 'Happy Hour encerrado hoje',
        isHappeningNow: false,
        hintText: 'Próximo Happy Hour: segunda às 16h',
      };
    }

    return {
      status: 'closed_today',
      badgeText: 'Happy Hour encerrado hoje',
      isHappeningNow: false,
      hintText: 'Amanhã a partir das 16h',
    };
  }

  // Saturday (6) or Sunday (0)
  return {
    status: 'weekend',
    badgeText: 'Próximo Happy Hour: segunda às 16h',
    isHappeningNow: false,
    hintText: 'De segunda a sexta, 16h às 20h',
  };
}

export interface BusinessStatusResult {
  isOpen: boolean;
  statusBadge: string;
  currentDaySchedule: DaySchedule;
  closingOrOpeningText: string;
  todayName: string;
  todayHoursDisplay: string;
}

/**
 * Calculates current business open/closed status taking into account overnight shifts
 */
export function getBusinessStatus(now: SaoPauloTimeInfo = getSaoPauloNow()): BusinessStatusResult {
  const { dayOfWeek, totalMinutes } = now;
  const todaySchedule = BUSINESS_HOURS.find((s) => s.dayIndex === dayOfWeek) || BUSINESS_HOURS[0];
  const yesterdayIndex = (dayOfWeek + 6) % 7;
  const yesterdaySchedule = BUSINESS_HOURS.find((s) => s.dayIndex === yesterdayIndex) || BUSINESS_HOURS[0];

  // 1. Check if we are within yesterday's overnight shift spillover (after 00:00)
  // e.g. Friday opens at 16:00 and closes Saturday at 01:00.
  // If today is Saturday and totalMinutes < 60 (01:00 AM), we are STILL in Friday's shift.
  if (yesterdaySchedule.closesNextDay) {
    const spilloverCloseMinutes = yesterdaySchedule.closeHour * 60 + yesterdaySchedule.closeMinute;
    if (totalMinutes < spilloverCloseMinutes) {
      const closeDisplay =
        yesterdaySchedule.closeHour === 0 && yesterdaySchedule.closeMinute === 30
          ? '00h30'
          : yesterdaySchedule.closeHour === 1
          ? '01h'
          : `${yesterdaySchedule.closeHour}h${
              yesterdaySchedule.closeMinute ? String(yesterdaySchedule.closeMinute).padStart(2, '0') : ''
            }`;

      return {
        isOpen: true,
        statusBadge: 'ABERTO AGORA',
        currentDaySchedule: yesterdaySchedule,
        closingOrOpeningText: `Hoje até ${closeDisplay}`,
        todayName: todaySchedule.dayName,
        todayHoursDisplay: todaySchedule.displayHours,
      };
    }
  }

  // 2. Check today's shift
  const todayOpenMinutes = todaySchedule.openHour * 60 + todaySchedule.openMinute;

  if (totalMinutes >= todayOpenMinutes) {
    // We opened today and are operating until closing (which spills past midnight)
    const closeDisplay =
      todaySchedule.closeHour === 0 && todaySchedule.closeMinute === 0
        ? '00h'
        : todaySchedule.closeHour === 0 && todaySchedule.closeMinute === 30
        ? '00h30'
        : todaySchedule.closeHour === 1
        ? '01h'
        : `${todaySchedule.closeHour}h${
            todaySchedule.closeMinute ? String(todaySchedule.closeMinute).padStart(2, '0') : ''
          }`;

    return {
      isOpen: true,
      statusBadge: 'ABERTO AGORA',
      currentDaySchedule: todaySchedule,
      closingOrOpeningText: `Hoje até ${closeDisplay}`,
      todayName: todaySchedule.dayName,
      todayHoursDisplay: todaySchedule.displayHours,
    };
  }

  // 3. We are closed before today's opening
  const openDisplay = `${todaySchedule.openHour}h`;
  return {
    isOpen: false,
    statusBadge: 'FECHADO AGORA',
    currentDaySchedule: todaySchedule,
    closingOrOpeningText: `Abrimos hoje às ${openDisplay}`,
    todayName: todaySchedule.dayName,
    todayHoursDisplay: todaySchedule.displayHours,
  };
}
