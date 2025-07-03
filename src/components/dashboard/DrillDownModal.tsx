import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import type { TransferItem, DailyCostData } from "@/types";
import { ScrollArea } from "@/components/ui/scroll-area";

interface DrillDownModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: TransferItem[] | null;
  selectedEntry: DailyCostData | null;
}

export function DrillDownModal({ isOpen, onClose, data, selectedEntry }: DrillDownModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl md:max-w-3xl max-h-[90vh] flex flex-col bg-card">
        <DialogHeader>
          <DialogTitle className="font-headline text-2xl">
            Cost Drill-Down: {selectedEntry?.outletName}
          </DialogTitle>
          <DialogDescription>
            Transferred items for date: {selectedEntry?.date}
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="flex-grow overflow-y-auto pr-6">
          {data && data.length > 0 ? (
            <Table>
              <TableHeader className="sticky top-0 bg-card z-10">
                <TableRow>
                  <TableHead className="font-headline">Item Name</TableHead>
                  <TableHead className="font-headline">Category</TableHead>
                  <TableHead className="text-right font-headline">Quantity</TableHead>
                  <TableHead className="text-right font-headline">Unit Cost</TableHead>
                  <TableHead className="text-right font-headline">Total Cost</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.itemName}</TableCell>
                    <TableCell>{item.category}</TableCell>
                    <TableCell className="text-right font-code">{item.quantity.toFixed(2)}</TableCell>
                    <TableCell className="text-right font-code">${item.unitCost.toFixed(2)}</TableCell>
                    <TableCell className="text-right font-code">${item.totalCost.toFixed(2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-muted-foreground text-center py-8">No transfer items found for this selection.</p>
          )}
        </ScrollArea>
        
        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
