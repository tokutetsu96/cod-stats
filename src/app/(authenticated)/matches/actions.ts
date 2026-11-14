"use server";

import { revalidatePath } from "next/cache";
import { getProfile } from "@/lib/supabase/auth";
import { getCurrentTitle } from "@/lib/supabase/titles";
import { isValidYoutubeUrl } from "@/lib/utils";
import type { ActionResult } from "@/lib/types";
import {
  validateScores,
  YOUTUBE_URL_ERROR,
  type SeriesPayload,
} from "./_components/series-form-shared";

export type SaveSeriesResult =
  | { ok: true; seriesId: string }
  | { ok: false; error: string };

/**
 * 対戦（シリーズ+ゲーム+スタッツ）の作成・更新。
 * save_series_with_games RPC が1トランザクションで原子的に処理するため、
 * 途中失敗で中途半端なデータが残ることはない。
 * team_id / result / game_number はDB側で導出する。
 */
export async function saveSeries(
  payload: SeriesPayload,
  seriesId?: string,
): Promise<SaveSeriesResult> {
  // Server Action は公開エンドポイントのため、必ず内部で認証・認可を検証する
  const { supabase, profile } = await getProfile();
  if (profile.role !== "admin") {
    return { ok: false, error: "管理者権限が必要です" };
  }

  if (!payload.series.opponent_id) {
    return { ok: false, error: "対戦相手を選択してください" };
  }
  if (payload.games.length === 0) {
    return { ok: false, error: "ゲームを1つ以上追加してください" };
  }
  const scoreError = validateScores(payload.games);
  if (scoreError) {
    return { ok: false, error: scoreError };
  }
  if (
    payload.series.youtube_url &&
    !isValidYoutubeUrl(payload.series.youtube_url)
  ) {
    return { ok: false, error: YOUTUBE_URL_ERROR };
  }

  // 新規作成時のみ使用される（編集時はRPC側で既存シリーズの作品を維持する）
  const { currentTitle } = await getCurrentTitle();

  const { data, error } = await supabase.rpc("save_series_with_games", {
    p_payload: payload,
    p_series_id: seriesId ?? null,
    p_title_id: currentTitle?.id ?? null,
  });
  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath("/matches");
  return { ok: true, seriesId: data as string };
}

/** 対戦を削除する（関連するゲーム・スタッツも併せて削除される） */
export async function deleteSeries(seriesId: string): Promise<ActionResult> {
  const { supabase, profile } = await getProfile();
  if (profile.role !== "admin") return { ok: false, error: "管理者権限が必要です" };
  const { data, error } = await supabase
    .from("series")
    .delete()
    .eq("id", seriesId)
    .eq("team_id", profile.team_id)
    .select("id");
  if (error || !data?.length) return { ok: false, error: "削除に失敗しました" };
  revalidatePath("/matches");
  return { ok: true };
}
