import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export function DashboardSkeleton() {
  return (
    <>
      {/* 直近の調子と勝率 */}
      <div className="h-60 bg-muted animate-pulse rounded-xl" />

      {/* KD table */}
      <Card>
        <CardHeader className="pb-3 px-5 pt-5">
          <CardTitle className="text-sm font-semibold text-muted-foreground">メンバー別 K/D</CardTitle>
        </CardHeader>
        <CardContent className="px-5 pb-5 space-y-3">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-8 bg-muted animate-pulse rounded" />
          ))}
        </CardContent>
      </Card>

      {/* Recent matches */}
      <Card>
        <CardHeader className="pb-3 px-5 pt-5">
          <CardTitle className="text-sm font-semibold text-muted-foreground">直近の対戦</CardTitle>
        </CardHeader>
        <CardContent className="px-5 pb-5 space-y-3">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="h-8 bg-muted animate-pulse rounded" />
          ))}
        </CardContent>
      </Card>
    </>
  );
}
