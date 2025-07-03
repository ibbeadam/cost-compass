"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface RecordsPerPageSelectorProps {
  value: number;
  onChange: (value: number) => void;
  options?: number[];
  disabled?: boolean;
}

export function RecordsPerPageSelector({
  value,
  onChange,
  options = [5, 10, 20, 50],
  disabled = false,
}: RecordsPerPageSelectorProps) {
  return (
    <div className="flex items-center space-x-2">
      <span className="text-sm text-muted-foreground whitespace-nowrap">Show</span>
      <Select
        value={value.toString()}
        onValueChange={(v) => onChange(parseInt(v, 10))}
        disabled={disabled}
      >
        <SelectTrigger className="w-20 h-9">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option} value={option.toString()}>
              {option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <span className="text-sm text-muted-foreground whitespace-nowrap">per page</span>
    </div>
  );
}