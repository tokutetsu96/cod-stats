import { Suspense } from "react";
import { getProfile } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import type { Opponent } from "@/lib/types";
import { DashboardFilter } from "./_components/dashboard-filter";
import { DashboardContent } from "./_components/dashboard-content";
import { DashboardSkeleton } from "./_components/dashboard-skeleton";
import type { DashboardSearchParams } from "./_components/dashboard-filters";

async function DashboardFilterServer() {
  const supabase = await createClient();
  const { profile } = await getProfile();
  const { data: opponents } = await supabase
    .from("opponents")
    .select("id, name")
    .eq("team_id", profile.team_id)
    .order("name");
  return <DashboardFilter opponents={(opponents ?? []) as Opponent[]} />;
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<DashboardSearchParams>;
}) {
  const params = await searchParams;
  const contentKey = [params.opponent, params.period, params.from, params.to, params.mode]
    .map((v) => v ?? "")
    .join("|");

  return (
    <main className="mx-auto max-w-6xl p-4 space-y-6 pt-6">
      {/* Filter */}
      <Suspense fallback={<div className="h-9 w-full bg-muted rounded animate-pulse" />}>
        <DashboardFilterServer />
      </Suspense>

      <Suspense key={contentKey} fallback={<DashboardSkeleton />}>
        <DashboardContent params={params} />
      </Suspense>
    </main>
  );
}
