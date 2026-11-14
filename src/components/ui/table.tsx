import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * 読み取り用データテーブルの共通部品。
 * 数値列は `numeric` を付けると右揃え＋等幅数字になり、桁が縦に揃う。
 */
function Table({ className, ...props }: React.ComponentProps<"table">) {
  return <table className={cn("w-full text-sm data-table", className)} {...props} />;
}

function Th({ numeric, className, ...props }: React.ComponentProps<"th"> & { numeric?: boolean }) {
  return (
    <th
      className={cn(
        "pb-2.5 font-medium text-muted-foreground text-xs whitespace-nowrap",
        numeric ? "text-right pl-3" : "text-left",
        className,
      )}
      {...props}
    />
  );
}

function Td({ numeric, className, ...props }: React.ComponentProps<"td"> & { numeric?: boolean }) {
  return (
    <td
      className={cn("py-2.5", numeric && "text-right pl-3 stat-number whitespace-nowrap", className)}
      {...props}
    />
  );
}

export { Table, Th, Td };
