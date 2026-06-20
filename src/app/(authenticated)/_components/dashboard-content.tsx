import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/supabase/auth";
import { DashboardStats } from "./dashboard-stats";
import { DashboardKDTable } from "./dashboard-kd-table";
import { DashboardRecentMatches } from "./dashboard-recent-matches";

export async function DashboardContent({ opponentId }: { opponentId?: string }) {
  let seriesIds: string[] | null = null;

  if (opponentId) {
    const supabase = await createClient();
    const { profile } = await getProfile();
    const { data } = await supabase
      .from("series")
      .select("id")
      .eq("team_id", profile.team_id)
      .eq("opponent_id", opponentId);
    seriesIds = (data ?? []).map((s) => s.id);
  }

  return (
    <>
      <Suspense
        fallback={
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="h-28 bg-muted animate-pulse rounded-xl" />
              <div className="h-28 bg-muted animate-pulse rounded-xl" />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="h-28 bg-muted animate-pulse rounded-xl" />
              <div className="h-28 bg-muted animate-pulse rounded-xl" />
              <div className="h-28 bg-muted animate-pulse rounded-xl" />
            </div>
          </div>
        }
      >
        <DashboardStats seriesIds={seriesIds} />
      </Suspense>

      <Suspense fallback={<div className="h-64 bg-muted animate-pulse rounded-xl" />}>
        <DashboardKDTable seriesIds={seriesIds} />
      </Suspense>

      <Suspense fallback={<div className="h-64 bg-muted animate-pulse rounded-xl" />}>
        <DashboardRecentMatches seriesIds={seriesIds} />
      </Suspense>
    </>
  );
}
