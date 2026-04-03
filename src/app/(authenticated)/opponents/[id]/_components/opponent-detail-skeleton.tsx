import { Card, CardHeader, CardContent } from "@/components/ui/card";

export function OpponentDetailSkeleton() {
  return (
    <>
      <div className="flex items-center gap-2">
        <div className="h-4 w-16 bg-muted rounded animate-pulse" />
        <span className="text-muted-foreground">/</span>
        <div className="h-7 w-40 bg-muted rounded animate-pulse" />
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="border-l-2 border-l-border">
            <CardContent className="p-4">
              <div className="h-3 w-16 bg-muted rounded animate-pulse mb-2" />
              <div className="h-9 w-12 bg-muted rounded animate-pulse" />
              <div className="h-3 w-20 bg-muted rounded animate-pulse mt-2" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader className="pb-3 px-5 pt-5">
          <div className="h-4 w-28 bg-muted rounded animate-pulse" />
        </CardHeader>
        <CardContent className="px-5 pb-5">
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-8 bg-muted rounded animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <div className="h-5 w-24 bg-muted rounded animate-pulse" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-12 bg-muted rounded animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    </>
  );
}
