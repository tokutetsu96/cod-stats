import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Eye, Pencil, ChevronLeft, ChevronRight, MessageSquare } from "lucide-react";
import { SeriesTypeBadge, WinLossRecord } from "@/components/series-badges";
import { UserAvatar } from "@/components/user-avatar";
import type { Tables } from "@/lib/database.types";
import { cn, countResults, formatDate, isValidYoutubeUrl } from "@/lib/utils";
import { DeleteSeriesButton } from "./delete-series-button";
import { OpponentFilter } from "./opponent-filter";

// Server Component。操作が必要な部分（絞り込み・削除ボタン）だけを Client Component として切り出している

export const SERIES_PAGE_SIZE = 20;

export type SeriesListRow = Pick<Tables<"series">, "id" | "series_date" | "type" | "youtube_url"> & {
  opponents: Pick<Tables<"opponents">, "name"> | null;
  games: Pick<Tables<"games">, "result">[];
  series_comments: (Pick<Tables<"series_comments">, "user_id"> & {
    profiles: Pick<Tables<"profiles">, "username" | "avatar"> | null;
  })[];
};

type CommentAuthor = { userId: string; username: string | null; avatar: string | null };

const MAX_COMMENT_AVATARS = 3;

/** メモの投稿者を重複なしで返す（投稿順） */
function uniqueAuthors(comments: SeriesListRow["series_comments"]): CommentAuthor[] {
  const seen = new Map<string, CommentAuthor>();
  for (const c of comments) {
    if (!seen.has(c.user_id)) {
      seen.set(c.user_id, { userId: c.user_id, username: c.profiles?.username ?? null, avatar: c.profiles?.avatar ?? null });
    }
  }
  return [...seen.values()];
}

/** メモの件数と投稿者アバター。対戦詳細のメモ欄へのリンクになる */
function CommentSummary({ id, count, authors }: { id: string; count: number; authors: CommentAuthor[] }) {
  if (count === 0) return <span className="text-muted-foreground">-</span>;
  const rest = authors.length - MAX_COMMENT_AVATARS;
  return (
    <Link
      href={`/matches/${id}#comments`}
      aria-label={`メモ ${count}件`}
      className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
    >
      <span className="inline-flex items-center gap-1 text-xs stat-number">
        <MessageSquare className="h-3.5 w-3.5" />
        {count}
      </span>
      <span className="flex -space-x-1.5">
        {authors.slice(0, MAX_COMMENT_AVATARS).map((a) => (
          <UserAvatar key={a.userId} username={a.username} avatar={a.avatar} size={20} className="ring-2 ring-card" />
        ))}
      </span>
      {rest > 0 ? <span className="text-xs">+{rest}</span> : null}
    </Link>
  );
}

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
        aria-label="前のページ"
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
            aria-current={p === currentPage ? "page" : undefined}
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
        aria-label="次のページ"
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

function YoutubeLink({ url, label }: { url: string | null; label: string }) {
  return url && isValidYoutubeUrl(url) ? (
    <a href={url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
      {label}
    </a>
  ) : (
    <span className="text-muted-foreground">-</span>
  );
}

function RowActions({ id, isAdmin }: { id: string; isAdmin: boolean }) {
  return (
    <div className="flex items-center gap-1">
      <Link href={`/matches/${id}`} aria-label="対戦の詳細" className={buttonVariants({ size: "icon", variant: "ghost" })}>
        <Eye className="h-4 w-4" />
      </Link>
      {isAdmin ? (
        <>
          <Link href={`/matches/${id}/edit`} aria-label="対戦を編集" className={buttonVariants({ size: "icon", variant: "ghost" })}>
            <Pencil className="h-4 w-4" />
          </Link>
          <DeleteSeriesButton id={id} />
        </>
      ) : null}
    </div>
  );
}

type Props = {
  seriesList: SeriesListRow[];
  opponents: { id: string; name: string }[];
  isAdmin: boolean;
  currentPage: number;
  totalPages: number;
  totalCount: number;
  opponentId: string;
};

export function SeriesList({ seriesList, opponents, isAdmin, currentPage, totalPages, totalCount, opponentId }: Props) {
  const rangeStart = totalCount === 0 ? 0 : (currentPage - 1) * SERIES_PAGE_SIZE + 1;
  const rangeEnd = Math.min(currentPage * SERIES_PAGE_SIZE, totalCount);
  const rows = seriesList.map((s) => ({
    ...s,
    record: countResults(s.games),
    commentCount: s.series_comments.length,
    commentAuthors: uniqueAuthors(s.series_comments),
  }));

  return (
    <div className="space-y-4">
      <OpponentFilter opponents={opponents} opponentId={opponentId} />

      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">対戦データがありません</p>
      ) : (
        <>
          {/* Mobile card layout */}
          <div className="space-y-2 md:hidden">
            {rows.map((s) => (
              <div key={s.id} className="border rounded-md p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">{s.opponents?.name ?? "-"}</span>
                  <SeriesTypeBadge type={s.type} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{formatDate(s.series_date)}</span>
                  <WinLossRecord {...s.record} className="text-sm" />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 text-xs">
                    <YoutubeLink url={s.youtube_url} label="YouTube" />
                    {s.commentCount > 0 ? <CommentSummary id={s.id} count={s.commentCount} authors={s.commentAuthors} /> : null}
                  </div>
                  <RowActions id={s.id} isAdmin={isAdmin} />
                </div>
              </div>
            ))}
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
                  <th className="pb-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wider">メモ</th>
                  <th className="pb-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wider w-24">操作</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((s) => (
                  <tr key={s.id} className="border-b border-border/50">
                    <td className="py-2.5 text-muted-foreground text-xs">{formatDate(s.series_date)}</td>
                    <td className="py-2.5">
                      <SeriesTypeBadge type={s.type} />
                    </td>
                    <td className="py-2.5 font-medium">{s.opponents?.name ?? "-"}</td>
                    <td className="py-2.5 text-xs">
                      <YoutubeLink url={s.youtube_url} label="YouTube URL" />
                    </td>
                    <td className="py-2.5">
                      <WinLossRecord {...s.record} />
                    </td>
                    <td className="py-2.5">
                      <CommentSummary id={s.id} count={s.commentCount} authors={s.commentAuthors} />
                    </td>
                    <td className="py-2.5">
                      <RowActions id={s.id} isAdmin={isAdmin} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex flex-col items-center gap-2 pt-2">
            <p className="text-xs text-muted-foreground">
              {totalCount}件中 {rangeStart}〜{rangeEnd}件表示
            </p>
            {totalPages > 1 ? (
              <Pagination currentPage={currentPage} totalPages={totalPages} opponentId={opponentId} />
            ) : null}
          </div>
        </>
      )}
    </div>
  );
}
