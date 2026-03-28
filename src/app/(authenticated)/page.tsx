import { Suspense } from "react";
import { getProfile } from "@/lib/supabase/auth";
import type { Opponent } from "@/lib/types";
import { DashboardFilter } from "./_components/dashboard-filter";
import { DashboardContent } from "./_components/dashboard-content";
import { DashboardSkeleton } from "./_components/dashboard-skeleton";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ opponent?: string }>;
}) {
  const { opponent: opponentId } = await searchParams;
  const { supabase } = await getProfile();

  const { data: opponents } = await supabase.from("opponents").select("id, name").order("name");
  const allOpponents = (opponents ?? []) as Opponent[];

  return (
    <main className="mx-auto max-w-6xl p-4 space-y-6 pt-6">
      {/* Filter */}
      <div className="flex justify-end">
        <DashboardFilter opponents={allOpponents} />
      </div>

      <Suspense key={opponentId ?? "all"} fallback={<DashboardSkeleton />}>
        <DashboardContent opponentId={opponentId} />
      </Suspense>
    </main>
  );
}
