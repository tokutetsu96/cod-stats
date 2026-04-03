import { Suspense } from "react";
import { OpponentDetailContent } from "./_components/opponent-detail-content";
import { OpponentDetailSkeleton } from "./_components/opponent-detail-skeleton";

export default async function OpponentStatsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return (
    <main className="mx-auto max-w-4xl p-4 space-y-6">
      <Suspense fallback={<OpponentDetailSkeleton />}>
        <OpponentDetailContent id={id} />
      </Suspense>
    </main>
  );
}
