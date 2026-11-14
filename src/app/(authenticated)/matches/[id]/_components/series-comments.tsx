import { getProfile } from "@/lib/supabase/auth";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import type { Tables } from "@/lib/database.types";
import { formatDateTime } from "@/lib/utils";
import { CommentThread, type CommentView, type CommentThreadView } from "./comment-thread";

type CommentRow = Pick<Tables<"series_comments">, "id" | "user_id" | "parent_id" | "body" | "created_at" | "updated_at"> & {
  // 脱退したメンバーのプロフィールは RLS で見えないため null になる
  profiles: Pick<Tables<"profiles">, "username" | "avatar"> | null;
};

export async function SeriesComments({ seriesId }: { seriesId: string }) {
  const { supabase, profile } = await getProfile();
  const { data } = await supabase
    .from("series_comments")
    .select("id, user_id, parent_id, body, created_at, updated_at, profiles(username, avatar)")
    .eq("series_id", seriesId)
    .eq("team_id", profile.team_id)
    .order("created_at")
    .overrideTypes<CommentRow[], { merge: false }>();

  // 親メモ（古い順）に返信をぶら下げる。日時はサーバー側で整形して渡す
  const threads: CommentThreadView[] = [];
  const threadById = new Map<string, CommentThreadView>();
  for (const row of data ?? []) {
    const view: CommentView = {
      id: row.id,
      userId: row.user_id,
      username: row.profiles?.username ?? null,
      avatar: row.profiles?.avatar ?? null,
      body: row.body,
      postedAt: formatDateTime(row.created_at),
      edited: row.updated_at > row.created_at,
    };
    if (row.parent_id === null) {
      const thread = { ...view, replies: [] };
      threads.push(thread);
      threadById.set(row.id, thread);
    } else {
      threadById.get(row.parent_id)?.replies.push(view);
    }
  }

  const total = data?.length ?? 0;

  return (
    <Card id="comments" className="scroll-mt-20">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold text-muted-foreground">
          メモ{total > 0 ? `（${total}）` : ""}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <CommentThread
          seriesId={seriesId}
          threads={threads}
          currentUser={{ id: profile.id, username: profile.username, avatar: profile.avatar }}
          isAdmin={profile.role === "admin"}
        />
      </CardContent>
    </Card>
  );
}

export function SeriesCommentsSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="h-4 w-20 bg-muted rounded animate-pulse" />
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="h-16 bg-muted rounded animate-pulse" />
        <div className="h-10 bg-muted rounded animate-pulse" />
      </CardContent>
    </Card>
  );
}
