"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Spinner } from "@/components/ui/spinner";
import { UserAvatar } from "@/components/user-avatar";
import { COMMENT_MAX_LENGTH } from "@/lib/constants";
import { useAction } from "@/lib/use-action";
import { cn } from "@/lib/utils";
import { addComment, deleteComment, updateComment } from "../../comment-actions";

export type CommentView = {
  id: string;
  userId: string;
  /** 脱退したメンバーは null */
  username: string | null;
  avatar: string | null;
  body: string;
  postedAt: string;
  edited: boolean;
};

export type CommentThreadView = CommentView & { replies: CommentView[] };

type CurrentUser = { id: string; username: string; avatar: string | null };

const LEFT_MEMBER = "脱退したメンバー";

/** 新規投稿・返信・編集で共用する入力欄。Ctrl/⌘+Enter でも送信できる */
function CommentEditor({
  initialValue = "",
  placeholder,
  submitLabel,
  autoFocus,
  onSubmit,
  onCancel,
}: {
  initialValue?: string;
  placeholder?: string;
  submitLabel: string;
  autoFocus?: boolean;
  /** 成功時に入力欄を空にするためのコールバックを受け取る */
  onSubmit: (body: string) => Promise<{ ok: true } | { ok: false; error: string }>;
  onCancel?: () => void;
}) {
  const [value, setValue] = useState(initialValue);
  const { pendingKey, error, run } = useAction();
  const pending = pendingKey !== null;
  const canSubmit = value.trim().length > 0 && !pending;

  const submit = () => {
    if (!canSubmit) return;
    run("submit", () => onSubmit(value), () => {
      setValue("");
      onCancel?.();
    });
  };

  return (
    <div className="space-y-2">
      <Textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit();
        }}
        placeholder={placeholder}
        maxLength={COMMENT_MAX_LENGTH}
        autoFocus={autoFocus}
        disabled={pending}
        aria-label={placeholder ?? submitLabel}
      />
      <div className="flex items-center gap-2">
        <Button size="sm" onClick={submit} disabled={!canSubmit}>
          {pending ? <Spinner /> : submitLabel}
        </Button>
        {onCancel ? (
          <Button size="sm" variant="outline" onClick={onCancel} disabled={pending}>
            キャンセル
          </Button>
        ) : null}
        {error ? <span role="alert" className="text-xs text-destructive">{error}</span> : null}
      </div>
    </div>
  );
}

function CommentItem({
  comment,
  currentUser,
  isAdmin,
  avatarSize,
  onReply,
}: {
  comment: CommentView;
  currentUser: CurrentUser;
  isAdmin: boolean;
  avatarSize: number;
  onReply?: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const { pendingKey, error, run } = useAction();
  const isOwn = comment.userId === currentUser.id;
  const canDelete = isOwn || isAdmin;
  const linkClass = "text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50";

  const handleDelete = () => {
    if (!confirm("このメモを削除しますか？（返信がある場合は返信も削除されます）")) return;
    run("delete", () => deleteComment(comment.id));
  };

  return (
    <div className="flex gap-3">
      <UserAvatar username={comment.username} avatar={comment.avatar} size={avatarSize} />
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-baseline gap-x-2">
          <span className={cn("text-sm font-medium", comment.username === null && "text-muted-foreground")}>
            {comment.username ?? LEFT_MEMBER}
          </span>
          <span className="text-xs text-muted-foreground">
            {comment.postedAt}
            {comment.edited ? "・編集済み" : ""}
          </span>
        </div>
        {editing ? (
          <CommentEditor
            initialValue={comment.body}
            submitLabel="保存"
            autoFocus
            onSubmit={(body) => updateComment(comment.id, body)}
            onCancel={() => setEditing(false)}
          />
        ) : (
          <>
            <p className="text-sm whitespace-pre-wrap break-words">{comment.body}</p>
            <div className="flex items-center gap-3">
              {onReply ? (
                <button type="button" className={linkClass} onClick={onReply}>
                  返信
                </button>
              ) : null}
              {isOwn ? (
                <button type="button" className={linkClass} onClick={() => setEditing(true)}>
                  編集
                </button>
              ) : null}
              {canDelete ? (
                <button
                  type="button"
                  className={cn(linkClass, "hover:text-destructive")}
                  onClick={handleDelete}
                  disabled={pendingKey !== null}
                >
                  {pendingKey !== null ? "削除中..." : "削除"}
                </button>
              ) : null}
              {error ? <span role="alert" className="text-xs text-destructive">{error}</span> : null}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export function CommentThread({
  seriesId,
  threads,
  currentUser,
  isAdmin,
}: {
  seriesId: string;
  threads: CommentThreadView[];
  currentUser: CurrentUser;
  isAdmin: boolean;
}) {
  // 返信フォームを開いている親メモの id（同時に開くのは1つだけ）
  const [replyingTo, setReplyingTo] = useState<string | null>(null);

  return (
    <div className="space-y-5">
      {threads.length === 0 ? (
        <p className="text-sm text-muted-foreground">まだメモはありません。気づいたことを残してみましょう。</p>
      ) : (
        <ul className="space-y-5">
          {threads.map((thread) => (
            <li key={thread.id} className="space-y-3">
              <CommentItem
                comment={thread}
                currentUser={currentUser}
                isAdmin={isAdmin}
                avatarSize={32}
                onReply={() => setReplyingTo(replyingTo === thread.id ? null : thread.id)}
              />
              {thread.replies.length > 0 || replyingTo === thread.id ? (
                <div className="ml-4 pl-4 sm:ml-11 sm:pl-4 border-l border-border space-y-3">
                  {thread.replies.map((reply) => (
                    <CommentItem
                      key={reply.id}
                      comment={reply}
                      currentUser={currentUser}
                      isAdmin={isAdmin}
                      avatarSize={24}
                    />
                  ))}
                  {replyingTo === thread.id ? (
                    <CommentEditor
                      placeholder={`${thread.username ?? LEFT_MEMBER} に返信`}
                      submitLabel="返信する"
                      autoFocus
                      onSubmit={(body) => addComment(seriesId, body, thread.id)}
                      onCancel={() => setReplyingTo(null)}
                    />
                  ) : null}
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      <div className="flex gap-3 pt-4 border-t border-border">
        <UserAvatar username={currentUser.username} avatar={currentUser.avatar} size={32} />
        <div className="min-w-0 flex-1">
          <CommentEditor
            placeholder="メモを残す（例: Game2のHP、P3の入りが遅い）"
            submitLabel="投稿する"
            onSubmit={(body) => addComment(seriesId, body)}
          />
        </div>
      </div>
    </div>
  );
}
