import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { DailyCostData } from "@/types";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle } from "lucide-react";

interface DailySummaryTableProps {
  data: DailyCostData[];
  onRowClick: (rowData: DailyCostData) => void;
}

export function DailySummaryTable({ data, onRowClick }: DailySummaryTableProps) {
  if (!data || data.length === 0) {
    return <p className="text-muted-foreground text-center py-8">No data available for the selected criteria.</p>;
  }

  return (
    <div className="rounded-lg border overflow-hidden shadow-md bg-card">
      <Table>
        <TableHeader className="bg-muted/50">
          <TableRow>
            <TableHead className="font-headline">Date</TableHead>
            <TableHead className="font-headline">Outlet</TableHead>
            <TableHead className="text-right font-headline">Food Revenue</TableHead>
            <TableHead className="text-right font-headline">Food Cost</TableHead>
            <TableHead className="text-right font-headline">Food Cost %</TableHead>
            <TableHead className="text-right font-headline">Bev Revenue</TableHead>
            <TableHead className="text-right font-headline">Bev Cost</TableHead>
            <TableHead className="text-right font-headline">Bev Cost %</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((item) => (
            <TableRow
              key={item.id}
              onClick={() => onRowClick(item)}
              className={`cursor-pointer hover:bg-accent/50 transition-colors ${item.isAnomalous ? 'bg-destructive/10 hover:bg-destructive/20' : ''}`}
              aria-label={`Details for ${item.outletName} on ${item.date}${item.isAnomalous ? '. Anomaly detected.' : ''}`}
            >
              <TableCell className="font-code">{item.date}</TableCell>
              <TableCell>
                {item.outletName}
                {item.isAnomalous && (
                  <Badge variant="destructive" className="ml-2" aria-label="Anomaly detected">
                    <AlertTriangle className="h-3 w-3 mr-1" /> Anomaly
                  </Badge>
                )}
              </TableCell>
              <TableCell className="text-right font-code">${item.foodRevenue.toFixed(2)}</TableCell>
              <TableCell className="text-right font-code">${item.foodCost.toFixed(2)}</TableCell>
              <TableCell className={`text-right font-code font-medium ${item.foodCostPct > 40 ? 'text-destructive' : ''}`}>
                {item.foodCostPct.toFixed(2)}%
              </TableCell>
              <TableCell className="text-right font-code">${item.beverageRevenue.toFixed(2)}</TableCell>
              <TableCell className="text-right font-code">${item.beverageCost.toFixed(2)}</TableCell>
              <TableCell className={`text-right font-code font-medium ${item.beverageCostPct > 40 ? 'text-destructive' : ''}`}>
                {item.beverageCostPct.toFixed(2)}%
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
