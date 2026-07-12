import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/supabase/auth";
import { Card, CardContent } from "@/components/ui/card";
import { modeLabel } from "@/lib/constants";
import type { GameMode } from "@/lib/types";

function WinRateBar({ rate }: { rate: string }) {
  const pct = parseFloat(rate);
  const color =
    pct >= 60 ? "var(--win)" : pct >= 45 ? "var(--primary)" : "var(--loss)";
  return (
    <div className="mt-3 space-y-1">
      <div className="h-1 w-full rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

export async function DashboardStats({
  seriesIds,
  mode,
}: {
  seriesIds: string[] | null;
  mode?: GameMode;
}) {
  const supabase = await createClient();
  await getProfile();

  // 集計は get_team_game_stats RPC でDB側に実施する。
  // mode ごとの total/wins/losses のみを返すため、games 全行を転送していた
  // 従来方式（limit 100 で「全体勝率」が直近100試合に限定されるバグ）を排除する。
  // RPC は SECURITY INVOKER で RLS により呼び出し元チームへ自動スコープされる。
  const { data } = await supabase.rpc("get_team_game_stats", {
    p_series_ids: seriesIds,
  });
  const allRows = (data ?? []) as {
    mode: string;
    total: number;
    wins: number;
    losses: number;
  }[];
  // モードフィルタ選択時は該当モードのみを母数にする
  const rows = mode ? allRows.filter((r) => r.mode === mode) : allRows;

  const modeCounts = {
    hardpoint: { total: 0, wins: 0, losses: 0 },
    snd: { total: 0, wins: 0, losses: 0 },
    overload: { total: 0, wins: 0, losses: 0 },
  };
  let totalGames = 0,
    totalWins = 0,
    totalLosses = 0;
  for (const r of rows) {
    totalGames += r.total;
    totalWins += r.wins;
    totalLosses += r.losses;
    const mc = modeCounts[r.mode as keyof typeof modeCounts];
    if (mc) {
      mc.total += r.total;
      mc.wins += r.wins;
      mc.losses += r.losses;
    }
  }
  const winRate =
    totalGames > 0 ? ((totalWins / totalGames) * 100).toFixed(1) : "0";
  const modeStats = (["hardpoint", "snd", "overload"] as const).map((mode) => {
    const mc = modeCounts[mode];
    const rate = mc.total > 0 ? ((mc.wins / mc.total) * 100).toFixed(1) : "0";
    return { mode, total: mc.total, wins: mc.wins, losses: mc.losses, rate };
  });

  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <Card className="border-l-2 border-l-primary">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
              総ゲーム数
            </p>
            <p className="stat-number text-3xl sm:text-4xl">{totalGames}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {totalWins}勝 {totalLosses}敗
            </p>
          </CardContent>
        </Card>

        <Card
          className="border-l-2"
          style={{
            borderLeftColor:
              parseFloat(winRate) >= 50 ? "var(--win)" : "var(--loss)",
          }}
        >
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
              {mode ? `${modeLabel[mode]} 勝率` : "全体勝率"}
            </p>
            <p className="stat-number text-3xl sm:text-4xl">
              {winRate}
              <span className="text-lg text-muted-foreground">%</span>
            </p>
            <WinRateBar rate={winRate} />
          </CardContent>
        </Card>
      </div>

      {/* モードフィルタ選択時は上段カードが該当モードの数値になるため、内訳は非表示 */}
      {!mode && (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {modeStats.map((ms) => (
          <Card key={ms.mode} className="border-l-2 border-l-border">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                {modeLabel[ms.mode]}
              </p>
              <p className="stat-number text-3xl sm:text-4xl">
                {ms.rate}
                <span className="text-lg text-muted-foreground">%</span>
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {ms.wins}勝 / {ms.total}試合
              </p>
              <WinRateBar rate={ms.rate} />
            </CardContent>
          </Card>
        ))}
      </div>
      )}
    </>
  );
}
