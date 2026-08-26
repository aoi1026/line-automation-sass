import { formatNumber, formatPercent, formatYen } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { StaffPerformanceRow } from "./analytics-data";

/** スタッフ別の施術数・売上・構成比の一覧 */
export function StaffPerformanceTable({ rows }: { rows: StaffPerformanceRow[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>担当者</TableHead>
          <TableHead className="text-right">施術数</TableHead>
          <TableHead className="text-right">売上</TableHead>
          <TableHead className="text-right">平均単価</TableHead>
          <TableHead className="text-right">構成比</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.key}>
            <TableCell
              className={
                row.isUnassigned ? "text-gray-500" : "font-medium text-gray-900"
              }
            >
              {row.name}
            </TableCell>
            <TableCell className="whitespace-nowrap text-right tabular-nums text-gray-700">
              {formatNumber(row.count)}件
            </TableCell>
            <TableCell className="whitespace-nowrap text-right font-medium tabular-nums text-gray-900">
              {formatYen(row.revenue)}
            </TableCell>
            <TableCell className="whitespace-nowrap text-right tabular-nums text-gray-700">
              {formatYen(row.avgPrice)}
            </TableCell>
            <TableCell>
              <div className="flex items-center justify-end gap-2">
                <div className="hidden h-1.5 w-16 overflow-hidden rounded-full bg-gray-100 sm:block">
                  <div
                    className="h-full rounded-full bg-brand"
                    style={{ width: `${Math.min(100, row.share * 100)}%` }}
                  />
                </div>
                <span className="whitespace-nowrap tabular-nums text-gray-700">
                  {formatPercent(row.share)}
                </span>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
