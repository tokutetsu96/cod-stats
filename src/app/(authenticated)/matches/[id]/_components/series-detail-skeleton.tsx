import { Card, CardHeader, CardContent } from "@/components/ui/card";

export function SeriesDetailSkeleton() {
  return (
    <>
      <div className="space-y-2">
        <div className="h-7 w-48 bg-muted rounded animate-pulse" />
        <div className="h-4 w-64 bg-muted rounded animate-pulse" />
      </div>
      <Card>
        <CardHeader className="pb-3">
          <div className="h-4 w-32 bg-muted rounded animate-pulse" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-8 bg-muted rounded animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
      {[...Array(3)].map((_, i) => (
        <Card key={i}>
          <CardHeader className="pb-3">
            <div className="h-5 w-40 bg-muted rounded animate-pulse" />
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                {[...Array(4)].map((_, j) => (
                  <div key={j} className="h-6 bg-muted rounded animate-pulse" />
                ))}
              </div>
              <div className="space-y-2">
                {[...Array(4)].map((_, j) => (
                  <div key={j} className="h-6 bg-muted rounded animate-pulse" />
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </>
  );
}
