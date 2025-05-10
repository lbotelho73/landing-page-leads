
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DateRangePicker, DateRange } from "@/components/ui/date-range-picker";

type PaymentFilterProps = {
  onDateRangeChange: (range: { from: Date; to: Date } | undefined) => void;
  onStatusChange: (status: string | undefined) => void;
  dateRange?: { from: Date; to: Date };
  status?: string;
};

export function PaymentFilter({ onDateRangeChange, onStatusChange, dateRange, status }: PaymentFilterProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<string>("this-month");
  
  const handlePeriodChange = (period: string) => {
    setSelectedPeriod(period);
    
    const now = new Date();
    let from, to;
    
    switch (period) {
      case "today":
        from = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        to = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      
      case "this-week":
        // Start of week (Sunday)
        const day = now.getDay();
        from = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day);
        // End of week (Saturday)
        to = new Date(from);
        to.setDate(from.getDate() + 6);
        break;
        
      case "this-month":
        from = new Date(now.getFullYear(), now.getMonth(), 1);
        to = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        break;
        
      case "last-month":
        from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        to = new Date(now.getFullYear(), now.getMonth(), 0);
        break;
        
      case "this-year":
        from = new Date(now.getFullYear(), 0, 1);
        to = new Date(now.getFullYear(), 11, 31);
        break;
        
      case "all":
        from = new Date(2000, 0, 1);
        to = new Date(2099, 11, 31);
        break;
        
      default:
        // Keep current range
        return;
    }
    
    onDateRangeChange({ from, to });
  };
  
  const handleStatusChange = (newStatus: string) => {
    onStatusChange(newStatus === "all" ? undefined : newStatus);
  };

  return (
    <Card>
      <CardContent className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium mb-2 block">Período</label>
          <Select value={selectedPeriod} onValueChange={handlePeriodChange}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione um período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Hoje</SelectItem>
              <SelectItem value="this-week">Esta semana</SelectItem>
              <SelectItem value="this-month">Este mês</SelectItem>
              <SelectItem value="last-month">Mês passado</SelectItem>
              <SelectItem value="this-year">Este ano</SelectItem>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="custom">Personalizado</SelectItem>
            </SelectContent>
          </Select>
          
          {selectedPeriod === "custom" && (
            <div className="mt-2">
              <DateRangePicker 
                value={dateRange ? { from: dateRange.from, to: dateRange.to } : undefined}
                onChange={onDateRangeChange}
              />
            </div>
          )}
        </div>
        
        <div>
          <label className="text-sm font-medium mb-2 block">Status</label>
          <Select value={status || "all"} onValueChange={handleStatusChange}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione um status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="To be paid">A Pagar</SelectItem>
              <SelectItem value="Paid">Pago</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
}
