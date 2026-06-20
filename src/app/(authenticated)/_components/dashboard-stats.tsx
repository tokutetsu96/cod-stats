import { Card, CardContent } from "@/components/ui/card";

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
  games,
}: {
  games: { result: string }[];
}) {
  const totalGames = games.length;
  const totalWins = games.filter((g) => g.result === "win").length;
  const totalLosses = games.filter((g) => g.result === "lose").length;
  const winRate =
    totalGames > 0 ? ((totalWins / totalGames) * 100).toFixed(1) : "0";

  return (
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
  );
}
