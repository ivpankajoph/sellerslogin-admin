import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";

interface ActivePagesChartProps {
  pages: { page: string; users: number }[];
  isLoading?: boolean;
}

export function ActivePagesChart({ pages, isLoading }: ActivePagesChartProps) {
  const maxUsers = Math.max(...pages.map(p => p.users), 1);
  const totalUsers = pages.reduce((sum, p) => sum + p.users, 0);

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="space-y-2">
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-8" />
              </div>
              <Skeleton className="h-2 w-full" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold">Active Pages</CardTitle>
          <span className="text-sm text-muted-foreground">{totalUsers} users</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {pages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <p className="text-sm text-muted-foreground">No active pages</p>
          </div>
        ) : (
          pages.slice(0, 8).map((page, index) => {
            const percentage = (page.users / maxUsers) * 100;
            const userPercentage = totalUsers > 0 ? ((page.users / totalUsers) * 100).toFixed(1) : 0;
            
            return (
              <div key={index} className="space-y-1.5" data-testid={`active-page-${index}`}>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium truncate max-w-[200px]" title={page.page}>
                    {page.page || '/'}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground tabular-nums">{page.users}</span>
                    <span className="text-xs text-muted-foreground/70 w-10 text-right">
                      {userPercentage}%
                    </span>
                  </div>
                </div>
                <Progress value={percentage} className="h-1.5" />
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
