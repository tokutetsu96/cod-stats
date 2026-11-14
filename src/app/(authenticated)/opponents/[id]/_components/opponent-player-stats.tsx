import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { PlayerKDTabs } from "@/components/player-kd-tabs";
import { addStat, toPlayerKDData, type PlayerAcc } from "@/lib/kd-stats";
import type { Database } from "@/lib/database.types";
import type { GameMode } from "@/lib/types";

type StatRow = Database["public"]["Functions"]["get_opponent_player_stats"]["Returns"][number];

/** 「要注意プレイヤー」に挙げる人数と、対象とする K/D の下限 */
const THREAT_LIMIT = 3;
const THREAT_MIN_KD = 1;

/** 対戦相手ページ: 相手プレイヤー別のスタッツ（要注意プレイヤー + モード別 K/D） */
export function OpponentPlayerStats({ rows, modes }: { rows: StatRow[]; modes: GameMode[] }) {
  const acc = new Map<string, PlayerAcc>();
  // その相手プレイヤーが出場したゲームでの自チームの勝数
  const teamWins = new Map<string, number>();
  for (const r of rows) {
    addStat(acc, r.opponent_player_id, r.player_name, r.mode, {
      kills: r.kills,
      deaths: r.deaths,
      damage: r.damage,
      count: r.games_count,
      hillTime: r.hill_time,
      plants: r.plants,
      defuses: r.defuses,
      firstBloods: r.first_bloods,
      firstDeaths: r.first_deaths,
      goals: r.goals,
      uploads: r.uploads,
      dunks: r.dunks,
      remotePlants: r.remote_plants,
    });
    teamWins.set(r.opponent_player_id, (teamWins.get(r.opponent_player_id) ?? 0) + r.team_wins);
  }
  const players = [...acc.values()].map(toPlayerKDData);

  const threats = players
    .filter((p) => parseFloat(p.overall.kd) >= THREAT_MIN_KD)
    .sort((a, b) => parseFloat(b.overall.kd) - parseFloat(a.overall.kd))
    .slice(0, THREAT_LIMIT);

  return (
    <Card>
      <CardHeader className="pb-3 px-5 pt-5">
        <CardTitle className="text-sm font-semibold tracking-wider uppercase text-muted-foreground">
          相手プレイヤー別スタッツ
        </CardTitle>
      </CardHeader>
      <CardContent className="px-5 pb-5 space-y-5">
        {players.length === 0 ? (
          <p className="text-sm text-muted-foreground">相手プレイヤーのスタッツが記録されていません</p>
        ) : (
          <>
            {threats.length > 0 ? (
              <div>
                <p className="text-xs text-muted-foreground mb-2">
                  要注意プレイヤー（K/D {THREAT_MIN_KD.toFixed(1)} 以上の上位{THREAT_LIMIT}名）
                </p>
                <ol className="grid gap-2 sm:grid-cols-3">
                  {threats.map((p, i) => {
                    const count = p.overall.count;
                    const wins = teamWins.get(p.id) ?? 0;
                    return (
                      <li key={p.id} className="rounded-md border border-l-2 border-l-loss px-3 py-2">
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="min-w-0 truncate font-medium">
                            <span className="text-muted-foreground stat-number mr-1.5">{i + 1}</span>
                            {p.name}
                          </span>
                          <span className="stat-number text-lg font-semibold text-loss">{p.overall.kd}</span>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          <span className="stat-number">{count}</span>ゲーム ・ 平均
                          <span className="stat-number"> {p.overall.avgKills}</span>K /
                          <span className="stat-number"> {p.overall.avgDamage}</span>Dmg
                        </p>
                        <p className="text-xs text-muted-foreground">
                          出場時の自チーム勝率{" "}
                          <span className="stat-number text-foreground">{((wins / count) * 100).toFixed(1)}%</span>
                        </p>
                      </li>
                    );
                  })}
                </ol>
              </div>
            ) : null}
            <PlayerKDTabs players={players} modes={modes} />
          </>
        )}
      </CardContent>
    </Card>
  );
}
