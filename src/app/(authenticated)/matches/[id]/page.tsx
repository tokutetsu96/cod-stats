import { Suspense } from "react";
import { SeriesDetailContent } from "./_components/series-detail-content";
import { SeriesDetailSkeleton } from "./_components/series-detail-skeleton";
import { SeriesComments, SeriesCommentsSkeleton } from "./_components/series-comments";

export default async function SeriesDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return (
    <main className="mx-auto max-w-6xl p-4 space-y-6">
      <Suspense fallback={<SeriesDetailSkeleton />}>
        <SeriesDetailContent id={id} />
      </Suspense>
      {/* メモはスタッツ表示をブロックしないよう別の境界でストリーミングする */}
      <Suspense fallback={<SeriesCommentsSkeleton />}>
        <SeriesComments seriesId={id} />
      </Suspense>
    </main>
  );
}
