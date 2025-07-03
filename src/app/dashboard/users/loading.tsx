
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardDescription, CardTitle } from "@/components/ui/card";


export default function Loading() {
  return (
    <div className="space-y-4">
        <Skeleton className="h-8 w-1/4 bg-muted mb-4" />
        <div className="rounded-lg border overflow-hidden shadow-md bg-card">
            <Table>
                <TableHeader className="bg-muted/50">
                <TableRow>
                    <TableHead><Skeleton className="h-5 w-3/4 bg-muted" /></TableHead>
                    <TableHead><Skeleton className="h-5 w-1/2 bg-muted" /></TableHead>
                    <TableHead><Skeleton className="h-5 w-1/4 bg-muted" /></TableHead>
                    <TableHead><Skeleton className="h-5 w-1/4 bg-muted" /></TableHead>
                    <TableHead className="text-right"><Skeleton className="h-5 w-20 bg-muted ml-auto" /></TableHead>
                </TableRow>
                </TableHeader>
                <TableBody>
                {[...Array(3)].map((_, i) => (
                    <TableRow key={i}>
                    <TableCell><Skeleton className="h-5 w-full bg-muted" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-full bg-muted" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-full bg-muted" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-full bg-muted" /></TableCell>
                    <TableCell className="text-right">
                        <div className="flex justify-end space-x-2">
                        <Skeleton className="h-8 w-8 bg-muted" />
                        <Skeleton className="h-8 w-8 bg-muted" />
                        </div>
                    </TableCell>
                    </TableRow>
                ))}
                </TableBody>
            </Table>
        </div>
        <div className="flex justify-between items-center mt-4">
            <Skeleton className="h-5 w-1/4 bg-muted" />
            <div className="flex space-x-1">
                <Skeleton className="h-8 w-8 bg-muted" />
                <Skeleton className="h-8 w-8 bg-muted" />
                <Skeleton className="h-8 w-8 bg-muted" />
                <Skeleton className="h-8 w-8 bg-muted" />
            </div>
        </div>
    </div>
  );
}
