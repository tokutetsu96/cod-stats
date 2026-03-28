import { Suspense } from "react";
import { getProfile } from "@/lib/supabase/auth";
import type { Opponent } from "@/lib/types";
import { DashboardFilter } from "./_components/dashboard-filter";
import { DashboardContent } from "./_components/dashboard-content";
import { DashboardSkeleton } from "./_components/dashboard-skeleton";

async function DashboardFilterServer() {
  const { supabase } = await getProfile();
  const { data: opponents } = await supabase.from("opponents").select("id, name").order("name");
  return <DashboardFilter opponents={(opponents ?? []) as Opponent[]} />;
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ opponent?: string }>;
}) {
  const { opponent: opponentId } = await searchParams;

  return (
    <main className="mx-auto max-w-6xl p-4 space-y-6 pt-6">
      {/* Filter */}
      <div className="flex justify-end">
        <Suspense fallback={<div className="h-9 w-48 bg-muted rounded animate-pulse" />}>
          <DashboardFilterServer />
        </Suspense>
      </div>

      <Suspense key={opponentId ?? "all"} fallback={<DashboardSkeleton />}>
        <DashboardContent opponentId={opponentId} />
      </Suspense>
    </main>
  );
}
