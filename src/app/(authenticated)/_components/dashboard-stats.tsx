import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/supabase/auth";
import { Card, CardContent } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { modeLabel } from "@/lib/constants";
import { cn, countResults, formatDate } from "@/lib/utils";
import type { Tables } from "@/lib/database.types";
import type { GameMode } from "@/lib/types";
import type { DashboardFilters } from "./dashboard-filters";

const FORM_LENGTH = 10;

type FormSeriesRow = Pick<Tables<"series">, "id" | "series_date"> & {
  opponents: Pick<Tables<"opponents">, "name"> | null;
  games: Pick<Tables<"games">, "result">[];
};

const formTone = {
  W: "bg-win/15 text-win",
  L: "bg-loss/15 text-loss",
  D: "bg-muted text-muted-foreground",
} as const;

function rate(wins: number, total: number) {
  return total > 0 ? (wins / total) * 100 : null;
}

/** 勝率の横棒。全モードで同じ目盛り（0〜100%）を共有し、50% に目印を置いて比較できるようにする */
function WinRateBar({ pct }: { pct: number | null }) {
  return (
    <div aria-hidden className="relative h-2 w-full overflow-hidden rounded-full bg-muted">
      {pct !== null ? <div className="h-full rounded-full bg-team" style={{ width: `${Math.min(pct, 100)}%` }} /> : null}
      <div className="absolute inset-y-0 left-1/2 w-px bg-background" />
    </div>
  );
}

export async function DashboardStats({
  seriesIds,
  titleId,
  filters,
  modes,
}: {
  seriesIds: string[];
  titleId: string;
  filters: DashboardFilters;
  /** 作品のモード一覧（内訳の表示対象） */
  modes: GameMode[];
}) {
  const [supabase, { profile }] = await Promise.all([createClient(), getProfile()]);
  const { mode, opponentId, dateFrom, dateTo } = filters;

  // 直近の調子。モード選択時は !inner で該当モードのゲームを含むシリーズに絞り、勝敗もモード内で数える
  let formQuery = supabase
    .from("series")
    .select(
      mode
        ? "id, series_date, opponents(name), games!inner(result)"
        : "id, series_date, opponents(name), games(result)",
    )
    .eq("team_id", profile.team_id)
    .eq("title_id", titleId)
    .order("series_date", { ascending: false })
    .limit(FORM_LENGTH);
  if (mode) formQuery = formQuery.eq("games.mode", mode);
  if (opponentId) formQuery = formQuery.eq("opponent_id", opponentId);
  if (dateFrom) formQuery = formQuery.gte("series_date", dateFrom);
  if (dateTo) formQuery = formQuery.lte("series_date", dateTo);

  // 集計は get_team_game_stats RPC でDB側に実施する（mode ごとの total/wins/losses のみ返る）。
  // RPC は SECURITY INVOKER で RLS により呼び出し元チームへ自動スコープされる。
  const [{ data }, { data: formData }] = await Promise.all([
    supabase.rpc("get_team_game_stats", { p_series_ids: seriesIds }),
    formQuery.overrideTypes<FormSeriesRow[], { merge: false }>(),
  ]);
  const allRows = (data ?? []) as { mode: string; total: number; wins: number; losses: number }[];
  // モードフィルタ選択時は該当モードのみを母数にする
  const rows = mode ? allRows.filter((r) => r.mode === mode) : allRows;

  const modeCounts = new Map<string, { total: number; wins: number }>(modes.map((m) => [m, { total: 0, wins: 0 }]));
  let totalGames = 0,
    totalWins = 0,
    totalLosses = 0;
  for (const r of rows) {
    totalGames += r.total;
    totalWins += r.wins;
    totalLosses += r.losses;
    const mc = modeCounts.get(r.mode);
    if (mc) {
      mc.total += r.total;
      mc.wins += r.wins;
    }
  }
  // 表示は古い→新しい（右端が最新）
  const form = (formData ?? [])
    .map((s) => {
      const { wins, losses } = countResults(s.games);
      const letter: keyof typeof formTone = wins > losses ? "W" : wins < losses ? "L" : "D";
      return { id: s.id, letter, label: `${formatDate(s.series_date)} vs ${s.opponents?.name ?? "-"} ${wins}-${losses}` };
    })
    .reverse();

  if (totalGames === 0 && form.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-start gap-3 p-5">
          <p className="text-sm">この条件に当てはまる対戦はまだありません。</p>
          {profile.role === "admin" ? (
            <Link href="/matches/new" className={buttonVariants({ size: "sm" })}>
              対戦を登録する
            </Link>
          ) : null}
        </CardContent>
      </Card>
    );
  }

  return (
    <DashboardStatsView
      form={form}
      mode={mode}
      modes={modes}
      modeCounts={modeCounts}
      totals={{ games: totalGames, wins: totalWins, losses: totalLosses }}
    />
  );
}

/** 表示部分。データ取得と分けてあり、集計済みの値だけで描画できる */
export function DashboardStatsView({
  form,
  mode,
  modes,
  modeCounts,
  totals,
}: {
  form: { id: string; letter: keyof typeof formTone; label: string }[];
  mode?: GameMode;
  modes: GameMode[];
  modeCounts: Map<string, { total: number; wins: number }>;
  totals: { games: number; wins: number; losses: number };
}) {
  const { games: totalGames, wins: totalWins, losses: totalLosses } = totals;
  const overall = rate(totalWins, totalGames);

  return (
    <Card>
      <CardContent className="space-y-5 p-5">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0 space-y-2">
            <h2 className="text-xs font-medium text-muted-foreground">
              直近{form.length}戦<span className="ml-2 font-normal">右が最新</span>
            </h2>
            <ol className="flex gap-1 sm:gap-1.5">
              {form.map((f) => (
                <li key={f.id} className="min-w-0 max-w-8 flex-1">
                  <Link
                    href={`/matches/${f.id}`}
                    title={f.label}
                    aria-label={f.label}
                    className={cn(
                      "stat-number flex aspect-square w-full items-center justify-center rounded text-base transition-opacity hover:opacity-75",
                      formTone[f.letter],
                    )}
                  >
                    {f.letter}
                  </Link>
                </li>
              ))}
            </ol>
          </div>

          <div className="shrink-0 sm:text-right">
            <h2 className="text-xs font-medium text-muted-foreground">
              {mode ? `${modeLabel[mode]} のゲーム勝率` : "ゲーム勝率"}
            </h2>
            <p className="stat-number mt-1 text-5xl sm:text-6xl">
              {overall !== null ? overall.toFixed(1) : "-"}
              <span className="text-2xl text-muted-foreground">%</span>
            </p>
            <p className="mt-1.5 text-xs text-muted-foreground">
              {totalWins}勝 {totalLosses}敗（{totalGames}ゲーム）
            </p>
          </div>
        </div>

        {/* モードフィルタ選択時は上の数値が該当モードのものになるため、内訳は出さない */}
        {!mode ? (
          <dl className="space-y-3 border-t pt-4">
            {modes.map((m) => {
              const mc = modeCounts.get(m) ?? { total: 0, wins: 0 };
              const pct = rate(mc.wins, mc.total);
              return (
                <div key={m} className="grid grid-cols-[5.5rem_1fr_auto] items-center gap-x-3 sm:grid-cols-[6.5rem_1fr_4rem_5rem]">
                  <dt className="truncate text-sm font-medium">{modeLabel[m]}</dt>
                  <dd className="contents">
                    <WinRateBar pct={pct} />
                    <span className="stat-number text-right text-lg">
                      {pct !== null ? `${pct.toFixed(1)}%` : "-"}
                    </span>
                    <span className="stat-number col-start-3 text-right text-xs font-medium text-muted-foreground sm:col-start-auto">
                      {mc.wins}勝 / {mc.total}
                    </span>
                  </dd>
                </div>
              );
            })}
          </dl>
        ) : null}
      </CardContent>
    </Card>
  );
}
