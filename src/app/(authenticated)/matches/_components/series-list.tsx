"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Eye, Pencil, ChevronLeft, ChevronRight } from "lucide-react";
import { DeleteSeriesButton } from "./delete-series-button";
import type { Opponent, Series } from "@/lib/types";
import { cn, formatDate, isValidYoutubeUrl } from "@/lib/utils";

const PAGE_SIZE = 20;
const typeLabel: Record<string, string> = { scrim: "Scrim", tournament: "大会" };

function buildUrl(page: number, opponentId: string) {
  const params = new URLSearchParams();
  if (page > 1) params.set("page", String(page));
  if (opponentId) params.set("opponent", opponentId);
  const query = params.toString();
  return `/matches${query ? `?${query}` : ""}`;
}

function Pagination({
  currentPage,
  totalPages,
  opponentId,
}: {
  currentPage: number;
  totalPages: number;
  opponentId: string;
}) {
  const pages: (number | "ellipsis")[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (currentPage > 3) pages.push("ellipsis");
    for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
      pages.push(i);
    }
    if (currentPage < totalPages - 2) pages.push("ellipsis");
    pages.push(totalPages);
  }

  return (
    <div className="flex items-center gap-1">
      <Link
        href={buildUrl(currentPage - 1, opponentId)}
        aria-disabled={currentPage <= 1}
        className={cn(
          buttonVariants({ variant: "ghost", size: "icon" }),
          currentPage <= 1 && "pointer-events-none opacity-40"
        )}
      >
        <ChevronLeft className="h-4 w-4" />
      </Link>

      {pages.map((p, i) =>
        p === "ellipsis" ? (
          <span key={`ellipsis-${i}`} className="px-1.5 text-muted-foreground text-sm select-none">
            …
          </span>
        ) : (
          <Link
            key={p}
            href={buildUrl(p, opponentId)}
            className={cn(
              buttonVariants({ variant: p === currentPage ? "default" : "ghost", size: "sm" }),
              "min-w-[2rem]"
            )}
          >
            {p}
          </Link>
        )
      )}

      <Link
        href={buildUrl(currentPage + 1, opponentId)}
        aria-disabled={currentPage >= totalPages}
        className={cn(
          buttonVariants({ variant: "ghost", size: "icon" }),
          currentPage >= totalPages && "pointer-events-none opacity-40"
        )}
      >
        <ChevronRight className="h-4 w-4" />
      </Link>
    </div>
  );
}

type Props = {
  seriesList: Series[];
  opponents: Opponent[];
  isAdmin: boolean;
  currentPage: number;
  totalPages: number;
  totalCount: number;
  opponentId: string;
};

export function SeriesList({ seriesList, opponents, isAdmin, currentPage, totalPages, totalCount, opponentId }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleOpponentChange(e: React.ChangeEvent<HTMLSelectElement>) {
    startTransition(() => {
      router.push(buildUrl(1, e.target.value));
    });
  }

  const rangeStart = totalCount === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(currentPage * PAGE_SIZE, totalCount);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <label className="text-xs text-muted-foreground uppercase tracking-wider whitespace-nowrap">
          対戦チーム
        </label>
        <Select
          value={opponentId}
          onChange={handleOpponentChange}
          className={cn("w-full sm:w-48", isPending && "opacity-60")}
        >
          <option value="">すべて</option>
          {opponents.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </Select>
      </div>

      {seriesList.length === 0 ? (
        <p className="text-sm text-muted-foreground">対戦データがありません</p>
      ) : (
        <>
          {/* Mobile card layout */}
          <div className="space-y-2 md:hidden">
            {seriesList.map((s) => {
              const games = s.games ?? [];
              const wins = games.filter((g) => g.result === "win").length;
              const draws = games.filter((g) => g.result === "draw").length;
              const losses = games.length - wins - draws;
              return (
                <div key={s.id} className="border rounded-md p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">{s.opponents?.name ?? "-"}</span>
                    <span
                      className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                        s.type === "tournament" ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {typeLabel[s.type]}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">{formatDate(s.series_date)}</span>
                    <div>
                      <span className="text-win font-medium stat-number text-sm">{wins}W</span>
                      <span className="text-muted-foreground mx-1">-</span>
                      <span className="text-loss font-medium stat-number text-sm">{losses}L</span>
                      {draws > 0 && (
                        <>
                          <span className="text-muted-foreground mx-1">-</span>
                          <span className="text-primary font-medium stat-number text-sm">{draws}D</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="text-xs">
                      {s.youtube_url && isValidYoutubeUrl(s.youtube_url) ? (
                        <a href={s.youtube_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                          YouTube
                        </a>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <Link href={`/matches/${s.id}`} className={buttonVariants({ size: "icon", variant: "ghost" })}>
                        <Eye className="h-4 w-4" />
                      </Link>
                      {isAdmin && (
                        <>
                          <Link href={`/matches/${s.id}/edit`} className={buttonVariants({ size: "icon", variant: "ghost" })}>
                            <Pencil className="h-4 w-4" />
                          </Link>
                          <DeleteSeriesButton id={s.id} isAdmin={isAdmin} />
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop table layout */}
          <div className="overflow-x-auto hidden md:block">
            <table className="w-full text-sm data-table">
              <thead>
                <tr className="border-b text-left">
                  <th className="pb-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wider">日付</th>
                  <th className="pb-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wider">タイプ</th>
                  <th className="pb-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wider">対戦相手</th>
                  <th className="pb-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wider">YouTube</th>
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
                  return (
                    <tr key={s.id} className="border-b border-border/50">
                      <td className="py-2.5 text-muted-foreground text-xs">{formatDate(s.series_date)}</td>
                      <td className="py-2.5">
                        <span
                          className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                            s.type === "tournament" ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {typeLabel[s.type]}
                        </span>
                      </td>
                      <td className="py-2.5 font-medium">{s.opponents?.name ?? "-"}</td>
                      <td className="py-2.5 text-xs">
                        {s.youtube_url && isValidYoutubeUrl(s.youtube_url) ? (
                          <a href={s.youtube_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                            YouTube URL
                          </a>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
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
                          <Link href={`/matches/${s.id}`} className={buttonVariants({ size: "icon", variant: "ghost" })}>
                            <Eye className="h-4 w-4" />
                          </Link>
                          {isAdmin && (
                            <>
                              <Link href={`/matches/${s.id}/edit`} className={buttonVariants({ size: "icon", variant: "ghost" })}>
                                <Pencil className="h-4 w-4" />
                              </Link>
                              <DeleteSeriesButton id={s.id} isAdmin={isAdmin} />
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex flex-col items-center gap-2 pt-2">
            <p className="text-xs text-muted-foreground">
              {totalCount}件中 {rangeStart}〜{rangeEnd}件表示
            </p>
            {totalPages > 1 && (
              <Pagination currentPage={currentPage} totalPages={totalPages} opponentId={opponentId} />
            )}
          </div>
        </>
      )}
    </div>
  );
}
