import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface Column<T> {
  header: string;
  accessorKey: keyof T | ((row: T) => React.ReactNode);
  className?: string;
}

interface DataTableProps<T> {
  title?: string;
  data: T[];
  columns: Column<T>[];
  isLoading?: boolean;
  className?: string;
  pageSize?: number;
  emptyMessage?: string;
}

export function DataTable<T extends Record<string, any>>({ 
  title,
  data, 
  columns, 
  isLoading,
  className,
  pageSize = 10,
  emptyMessage = "No data available"
}: DataTableProps<T>) {
  const [page, setPage] = useState(0);
  const cardClassName = cn(
    "border border-sky-100/80 bg-white/85 shadow-sm backdrop-blur-sm dark:border-border dark:bg-card",
    className
  );
  
  const totalPages = Math.ceil(data.length / pageSize);
  const paginatedData = data.slice(page * pageSize, (page + 1) * pageSize);

  if (isLoading) {
    return (
      <Card className={cardClassName}>
        {title && (
          <CardHeader className="pb-3">
            <Skeleton className="h-5 w-40" />
          </CardHeader>
        )}
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                {columns.map((_col, i) => (
                  <TableHead key={i}>
                    <Skeleton className="h-4 w-20" />
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {[1, 2, 3, 4, 5].map((row) => (
                <TableRow key={row}>
                  {columns.map((_, i) => (
                    <TableCell key={i}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cardClassName}>
      {title && (
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold">{title}</CardTitle>
            <span className="text-sm text-muted-foreground">
              {data.length} items
            </span>
          </div>
        </CardHeader>
      )}
      <CardContent className="p-0">
        {data.length === 0 ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
            {emptyMessage}
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  {columns.map((col, i) => (
                    <TableHead key={i} className={col.className}>
                      {col.header}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedData.map((row, rowIndex) => (
                  <TableRow key={rowIndex} data-testid={`table-row-${rowIndex}`}>
                    {columns.map((col, colIndex) => (
                      <TableCell key={colIndex} className={col.className}>
                        {typeof col.accessorKey === 'function'
                          ? col.accessorKey(row)
                          : row[col.accessorKey]}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-border">
                <span className="text-sm text-muted-foreground">
                  Page {page + 1} of {totalPages}
                </span>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setPage(p => Math.max(0, p - 1))}
                    disabled={page === 0}
                    data-testid="button-prev-page"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                    disabled={page === totalPages - 1}
                    data-testid="button-next-page"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
