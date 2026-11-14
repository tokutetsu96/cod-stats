import { revalidatePath } from "next/cache";
import { getProfile } from "./auth";

// Server Action 共通ヘルパー（"use server" ファイルは async 関数しか export できないため分離）

export const FORBIDDEN = { ok: false, error: "権限がありません" } as const;

/** 選択中チームの管理者なら supabase / profile を返す。Server Action は公開エンドポイントのため必ず内部で検証する */
export async function getAdmin() {
  const { supabase, profile } = await getProfile();
  return profile.role === "admin" ? { supabase, profile } : null;
}

/**
 * mutation 後の再取得。プレイヤー名・作品などはダッシュボードやヘッダーにも表示されるため、
 * レイアウト配下をまとめて無効化する（全ページ動的レンダリングなので対象はクライアント側のルーターキャッシュ）。
 */
export function revalidateApp() {
  revalidatePath("/", "layout");
}
