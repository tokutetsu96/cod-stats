import Link from "next/link";
import { getProfile } from "@/lib/supabase/auth";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { UserAvatar } from "@/components/user-avatar";
import type { Tables } from "@/lib/database.types";
import { formatDateTime } from "@/lib/utils";

type RecentCommentRow = Pick<Tables<"series_comments">, "id" | "body" | "created_at"> & {
  // 脱退したメンバーのプロフィールは RLS で見えないため null になる
  profiles: Pick<Tables<"profiles">, "username" | "avatar"> | null;
  series: Pick<Tables<"series">, "id"> & { opponents: Pick<Tables<"opponents">, "name"> | null };
};

const RECENT_COMMENT_LIMIT = 5;

export async function DashboardRecentComments({ titleId }: { titleId: string }) {
  const { supabase, profile } = await getProfile();
  // !inner + series.title_id で選択中の作品の対戦に付いたメモだけに絞る
  const { data } = await supabase
    .from("series_comments")
    .select("id, body, created_at, profiles(username, avatar), series!inner(id, opponents(name))")
    .eq("team_id", profile.team_id)
    .eq("series.title_id", titleId)
    .order("created_at", { ascending: false })
    .limit(RECENT_COMMENT_LIMIT)
    .overrideTypes<RecentCommentRow[], { merge: false }>();
  const comments = data ?? [];

  return (
    <Card>
      <CardHeader className="pb-3 px-5 pt-5">
        <CardTitle className="text-sm font-semibold tracking-wider uppercase text-muted-foreground">
          最近のメモ
        </CardTitle>
      </CardHeader>
      <CardContent className="px-5 pb-5">
        {comments.length === 0 ? (
          <p className="text-muted-foreground text-sm">まだメモはありません</p>
        ) : (
          <ul>
            {comments.map((c) => (
              <li key={c.id} className="border-b border-border/50 last:border-b-0">
                <Link
                  href={`/matches/${c.series.id}#comments`}
                  className="flex gap-3 py-2.5 -mx-2 px-2 rounded-md hover:bg-accent/50 transition-colors"
                >
                  <UserAvatar username={c.profiles?.username} avatar={c.profiles?.avatar} size={32} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-x-2">
                      <span className="text-sm font-medium">{c.profiles?.username ?? "脱退したメンバー"}</span>
                      <span className="text-xs text-muted-foreground">
                        vs {c.series.opponents?.name ?? "-"}・{formatDateTime(c.created_at)}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2 break-words">{c.body}</p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
