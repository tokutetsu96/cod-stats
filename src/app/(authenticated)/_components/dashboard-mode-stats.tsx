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

export async function DashboardModeStats({
  games,
}: {
  games: { mode: string; result: string }[];
}) {
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
  );
}
