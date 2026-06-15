// Best-effort natural-language parser for quick event entry.
// Handles common Chinese + simple English phrasings, e.g.
//   "明天下午3点和张三开会1小时"
//   "周五 9:30 项目评审"
//   "6月20日 团队聚餐"  (no time → all-day)
import { addDays, startOfDay } from "./dates";

export type ParsedEvent = {
  title: string;
  start: Date;
  end: Date;
  allDay: boolean;
};

const CN_NUM: Record<string, number> = { 零: 0, 一: 1, 二: 2, 两: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10, 十一: 11, 十二: 12 };
const WEEKDAY: Record<string, number> = { 日: 0, 天: 0, 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6 };

function cnNumber(s: string): number | null {
  if (/^\d+$/.test(s)) return Number(s);
  if (s in CN_NUM) return CN_NUM[s];
  // 十X / X十 / X十Y
  const m = s.match(/^([一二两三四五六七八九]?)十([一二三四五六七八九]?)$/);
  if (m) {
    const tens = m[1] ? CN_NUM[m[1]] : 1;
    const ones = m[2] ? CN_NUM[m[2]] : 0;
    return tens * 10 + ones;
  }
  return null;
}

export function parseQuickEvent(input: string, base = new Date()): ParsedEvent | null {
  const text = input.trim();
  if (!text) return null;
  let rest = text;
  const strip = (re: RegExp) => {
    rest = rest.replace(re, " ");
  };

  let day = startOfDay(base);
  let hasTime = false;
  let hour = 9;
  let minute = 0;
  let durationMin = 60;

  // ---- Relative day words --------------------------------------------------
  if (/今天|today/i.test(rest)) {
    strip(/今天|today/gi);
  } else if (/后天/.test(rest)) {
    day = addDays(day, 2);
    strip(/后天/g);
  } else if (/大后天/.test(rest)) {
    day = addDays(day, 3);
    strip(/大后天/g);
  } else if (/明天|tomorrow/i.test(rest)) {
    day = addDays(day, 1);
    strip(/明天|tomorrow/gi);
  }

  // ---- Weekday (周三 / 星期五 / 下周一) -------------------------------------
  const wd = rest.match(/(下)?(?:周|星期|礼拜)([一二三四五六日天])/);
  if (wd) {
    const target = WEEKDAY[wd[2]];
    let delta = (target - day.getDay() + 7) % 7;
    if (delta === 0) delta = 7; // "周三" means the upcoming one
    if (wd[1]) delta += 7; // 下周
    day = addDays(day, delta);
    strip(/(下)?(?:周|星期|礼拜)[一二三四五六日天]/);
  }

  // ---- Explicit date: M月D日 / M/D / YYYY-M-D ------------------------------
  const ymd = rest.match(/(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  const md = rest.match(/(\d{1,2})\s*月\s*(\d{1,2})\s*[日号]?/);
  const slash = rest.match(/(?<!\d)(\d{1,2})\/(\d{1,2})(?!\d)/);
  if (ymd) {
    day = startOfDay(new Date(Number(ymd[1]), Number(ymd[2]) - 1, Number(ymd[3])));
    strip(/(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  } else if (md) {
    day = startOfDay(new Date(base.getFullYear(), Number(md[1]) - 1, Number(md[2])));
    strip(/(\d{1,2})\s*月\s*(\d{1,2})\s*[日号]?/);
  } else if (slash) {
    day = startOfDay(new Date(base.getFullYear(), Number(slash[1]) - 1, Number(slash[2])));
    strip(/(?<!\d)(\d{1,2})\/(\d{1,2})(?!\d)/);
  }

  // ---- Meridiem hint -------------------------------------------------------
  let pmHint = 0;
  if (/下午|晚上|傍晚|pm/i.test(rest)) pmHint = 12;
  if (/中午/.test(rest)) {
    hasTime = true;
    hour = 12;
    strip(/中午/g);
  }

  // ---- Time: HH:MM / H点[半|MM分] / Hpm ------------------------------------
  const hm = rest.match(/(\d{1,2}):(\d{2})/);
  const cnTime = rest.match(/(上午|下午|晚上|傍晚)?\s*([0-9一二两三四五六七八九十]+)\s*[点时](半|[0-9一二三四五六七八九十]+分?)?/);
  if (hm) {
    hasTime = true;
    hour = Number(hm[1]);
    minute = Number(hm[2]);
    if (pmHint && hour < 12) hour += 12;
    strip(/(上午|下午|晚上|傍晚)?\s*\d{1,2}:\d{2}/);
  } else if (cnTime) {
    const h = cnNumber(cnTime[2]);
    if (h != null) {
      hasTime = true;
      hour = h;
      const localPm = /下午|晚上|傍晚/.test(cnTime[1] ?? "") || pmHint;
      if (localPm && hour < 12) hour += 12;
      if (cnTime[3]) {
        if (cnTime[3] === "半") minute = 30;
        else {
          const mnum = cnNumber(cnTime[3].replace("分", ""));
          if (mnum != null) minute = mnum;
        }
      }
      strip(/(上午|下午|晚上|傍晚)?\s*[0-9一二两三四五六七八九十]+\s*[点时](半|[0-9一二三四五六七八九十]+分?)?/);
    }
  }
  strip(/上午|下午|晚上|傍晚|am|pm/gi);

  // ---- Duration: N小时 / N分钟 / Nh ----------------------------------------
  const durH = rest.match(/([0-9一二两三四五六七八九十.]+)\s*(?:个)?\s*(?:小时|hours?|h)/);
  const durM = rest.match(/([0-9一二三四五六七八九十]+)\s*(?:分钟|分|min)/);
  if (durH) {
    const v = /^[\d.]+$/.test(durH[1]) ? Number(durH[1]) : cnNumber(durH[1]) ?? 1;
    durationMin = Math.round(v * 60);
    strip(/([0-9一二两三四五六七八九十.]+)\s*(?:个)?\s*(?:小时|hours?|h)/);
  } else if (durM) {
    const v = /^\d+$/.test(durM[1]) ? Number(durM[1]) : cnNumber(durM[1]) ?? 30;
    durationMin = v;
    strip(/([0-9一二三四五六七八九十]+)\s*(?:分钟|分|min)/);
  }

  // ---- Build dates ---------------------------------------------------------
  const start = new Date(day);
  if (hasTime) start.setHours(hour, minute, 0, 0);
  const end = hasTime ? new Date(start.getTime() + durationMin * 60000) : new Date(day.getTime());
  if (!hasTime) end.setHours(23, 59, 59, 999);

  // ---- Title cleanup -------------------------------------------------------
  const title = rest
    .replace(/\b和\b|\b跟\b|^\s*[与和跟]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return { title: title || "新建事件", start, end, allDay: !hasTime };
}
