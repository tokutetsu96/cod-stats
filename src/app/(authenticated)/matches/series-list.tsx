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
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="pb-2 font-medium">日付</th>
                <th className="pb-2 font-medium">タイプ</th>
                <th className="pb-2 font-medium">対戦相手</th>
                <th className="pb-2 font-medium">ゲーム</th>
                <th className="pb-2 font-medium">戦績</th>
                <th className="pb-2 font-medium w-28">操作</th>
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
                  <tr key={s.id} className="border-b">
                    <td className="py-2">{formatDate(s.series_date)}</td>
                    <td className="py-2">
                      <span className={s.type === "tournament" ? "text-yellow-500 font-medium" : ""}>
                        {typeLabel[s.type]}
                      </span>
                    </td>
                    <td className="py-2 font-medium">{s.opponents?.name ?? "-"}</td>
                    <td className="py-2 text-xs text-muted-foreground">{gamesSummary || "-"}</td>
                    <td className="py-2">
                      <span className="text-green-500 font-medium">{wins}W</span>
                      {" - "}
                      <span className="text-red-500 font-medium">{losses}L</span>
                      {draws > 0 && <><span> - </span><span className="text-yellow-500 font-medium">{draws}D</span></>}
                    </td>
                    <td className="py-2">
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
