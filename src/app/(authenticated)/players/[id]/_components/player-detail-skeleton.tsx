import { Card, CardHeader, CardContent } from "@/components/ui/card";

export function PlayerDetailSkeleton() {
  return (
    <>
      <div className="h-7 w-56 bg-muted rounded animate-pulse" />
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <div className="h-4 w-20 bg-muted rounded animate-pulse" />
            </CardHeader>
            <CardContent>
              <div className="h-9 w-16 bg-muted rounded animate-pulse" />
            </CardContent>
          </Card>
        ))}
      </div>
      {[...Array(3)].map((_, i) => (
        <Card key={i}>
          <CardHeader>
            <div className="h-5 w-24 bg-muted rounded animate-pulse" />
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-6">
              {[...Array(5)].map((_, j) => (
                <div key={j} className="space-y-1">
                  <div className="h-3 w-16 bg-muted rounded animate-pulse" />
                  <div className="h-6 w-12 bg-muted rounded animate-pulse" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </>
  );
}
