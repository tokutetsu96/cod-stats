import { Suspense } from "react";
import { PlayerDetailContent } from "./_components/player-detail-content";
import { PlayerDetailSkeleton } from "./_components/player-detail-skeleton";

export default async function PlayerStatsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return (
    <main className="mx-auto max-w-6xl p-4 space-y-6">
      <Suspense fallback={<PlayerDetailSkeleton />}>
        <PlayerDetailContent id={id} />
      </Suspense>
    </main>
  );
}
