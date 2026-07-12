import type { GameMode } from "@/lib/types";

// ダッシュボードのフィルタ（searchParams）の解釈を一箇所に集約する。
// period: プリセット期間。custom のときのみ from / to を使う
export type PeriodPreset = "1w" | "1m" | "3m" | "custom";

export interface DashboardSearchParams {
  opponent?: string;
  period?: string;
  from?: string;
  to?: string;
  mode?: string;
}

export interface DashboardFilters {
  opponentId?: string;
  mode?: GameMode;
  dateFrom?: string;
  dateTo?: string;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MODES: GameMode[] = ["hardpoint", "snd", "overload"];

/** サーバーはUTCで動くため、「今日」はユーザーのタイムゾーン（東京）基準で求める */
function todayInTokyo(): Date {
  const s = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Tokyo" });
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function toDateStr(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function resolveDashboardFilters(
  params: DashboardSearchParams,
): DashboardFilters {
  const filters: DashboardFilters = {};

  if (params.opponent) filters.opponentId = params.opponent;
  if (params.mode && MODES.includes(params.mode as GameMode)) {
    filters.mode = params.mode as GameMode;
  }

  const today = todayInTokyo();
  switch (params.period) {
    case "1w": {
      const from = new Date(today);
      from.setDate(from.getDate() - 7);
      filters.dateFrom = toDateStr(from);
      break;
    }
    case "1m": {
      const from = new Date(today);
      from.setMonth(from.getMonth() - 1);
      filters.dateFrom = toDateStr(from);
      break;
    }
    case "3m": {
      const from = new Date(today);
      from.setMonth(from.getMonth() - 3);
      filters.dateFrom = toDateStr(from);
      break;
    }
    case "custom": {
      if (params.from && DATE_RE.test(params.from)) filters.dateFrom = params.from;
      if (params.to && DATE_RE.test(params.to)) filters.dateTo = params.to;
      break;
    }
  }

  return filters;
}
