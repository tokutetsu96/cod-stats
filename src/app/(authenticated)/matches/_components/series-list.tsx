import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Eye, Pencil } from "lucide-react";
import { DeleteSeriesButton } from "./delete-series-button";
import type { Series } from "@/lib/types";
import { formatDate } from "@/lib/utils";

const typeLabel: Record<string, string> = { scrim: "Scrim", tournament: "大会" };
const modeLabel: Record<string, string> = { hardpoint: "HP", snd: "S&D", overload: "OL" };

export function SeriesList({ seriesList }: { seriesList: Series[] }) {
  return (
    <div className="space-y-4">
      {seriesList.length === 0 ? (
        <p className="text-sm text-muted-foreground">対戦データがありません</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm data-table">
            <thead>
              <tr className="border-b text-left">
                <th className="pb-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wider">日付</th>
                <th className="pb-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wider">タイプ</th>
                <th className="pb-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wider">対戦相手</th>
                <th className="pb-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wider">ゲーム</th>
                <th className="pb-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wider">戦績</th>
                <th className="pb-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wider w-24">操作</th>
              </tr>
            </thead>
            <tbody>
              {seriesList.map((s) => {
                const games = s.games ?? [];
                const wins = games.filter((g) => g.result === "win").length;
                const draws = games.filter((g) => g.result === "draw").length;
                const losses = games.length - wins - draws;
                const gamesSummary = games
                  .sort((a, b) => a.game_number - b.game_number)
                  .map((g) => `${modeLabel[g.mode]}${g.maps ? `(${g.maps.name})` : ""}`)
                  .join(", ");

                return (
                  <tr key={s.id} className="border-b border-border/50">
                    <td className="py-2.5 text-muted-foreground text-xs">{formatDate(s.series_date)}</td>
                    <td className="py-2.5">
                      <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${s.type === "tournament" ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"}`}>
                        {typeLabel[s.type]}
                      </span>
                    </td>
                    <td className="py-2.5 font-medium">{s.opponents?.name ?? "-"}</td>
                    <td className="py-2.5 text-xs text-muted-foreground">{gamesSummary || "-"}</td>
                    <td className="py-2.5">
                      <span className="text-win font-medium stat-number">{wins}W</span>
                      <span className="text-muted-foreground mx-1">-</span>
                      <span className="text-loss font-medium stat-number">{losses}L</span>
                      {draws > 0 && (
                        <>
                          <span className="text-muted-foreground mx-1">-</span>
                          <span className="text-primary font-medium stat-number">{draws}D</span>
                        </>
                      )}
                    </td>
                    <td className="py-2.5">
                      <div className="flex items-center gap-1">
                        <Link href={`/matches/${s.id}`}>
                          <Button size="icon" variant="ghost">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Link href={`/matches/${s.id}/edit`}>
                          <Button size="icon" variant="ghost">
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </Link>
                        <DeleteSeriesButton id={s.id} />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
