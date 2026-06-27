import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/supabase/auth";
import { Card, CardContent } from "@/components/ui/card";
import { modeLabel } from "@/lib/constants";

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
}: {
  seriesIds: string[] | null;
}) {
  const supabase = await createClient();
  const { profile } = await getProfile();

  let q = supabase
    .from("games")
    .select("id, mode, result, series_id")
    .eq("team_id", profile.team_id)
    .order("created_at", { ascending: false })
    .limit(100);
  if (seriesIds !== null) q = q.in("series_id", seriesIds);
  const { data } = await q;
  const games = (data ?? []) as { id: string; mode: string; result: string; series_id: string }[];

  const totalGames = games.length;
  const totalWins = games.filter((g) => g.result === "win").length;
  const totalLosses = games.filter((g) => g.result === "lose").length;
  const winRate =
    totalGames > 0 ? ((totalWins / totalGames) * 100).toFixed(1) : "0";

  const modeCounts = {
    hardpoint: { total: 0, wins: 0, losses: 0 },
    snd: { total: 0, wins: 0, losses: 0 },
    overload: { total: 0, wins: 0, losses: 0 },
  };
  for (const g of games) {
    const mc = modeCounts[g.mode as keyof typeof modeCounts];
    if (mc) {
      mc.total++;
      if (g.result === "win") mc.wins++;
      else if (g.result === "lose") mc.losses++;
    }
  }
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
              全体勝率
            </p>
            <p className="stat-number text-3xl sm:text-4xl">
              {winRate}
              <span className="text-lg text-muted-foreground">%</span>
            </p>
            <WinRateBar rate={winRate} />
          </CardContent>
        </Card>
      </div>

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
    </>
  );
}
