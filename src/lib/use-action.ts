import { useState, useTransition } from "react";

type Result = { ok: true } | { ok: false; error: string };

/**
 * Server Action の実行状態（実行中のキー・エラー）をまとめて扱う。
 * key には「どの行のどの操作か」を渡し、該当ボタンだけスピナー表示・無効化するのに使う。
 */
export function useAction() {
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [, startTransition] = useTransition();

  const run = (key: string, action: () => Promise<Result>, onSuccess?: () => void) => {
    setError("");
    setPendingKey(key);
    startTransition(async () => {
      try {
        const result = await action();
        if (result.ok) onSuccess?.();
        else setError(result.error);
      } catch {
        setError("通信に失敗しました。時間をおいて再度お試しください");
      }
      setPendingKey(null);
    });
  };

  return { pendingKey, error, setError, run };
}
