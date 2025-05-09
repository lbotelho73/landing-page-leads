
import * as React from "react";
import { CalendarIcon } from "lucide-react";
import { DateRange as DayPickerDateRange } from "react-day-picker";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

// Export the DateRange type so it can be used in other components
export type DateRange = DayPickerDateRange;

export interface DateRangePickerProps {
  value?: DateRange;
  onChange?: (date: DateRange | undefined) => void;
  onValueChange?: (date: DateRange | undefined) => void;
  date?: DateRange;
  onDateChange?: (date: DateRange | undefined) => void;
  className?: string;
  from?: Date;
  to?: Date;
}

export function DateRangePicker({
  value,
  onChange,
  onValueChange,
  date,
  onDateChange,
  className,
  from,
  to,
}: DateRangePickerProps) {
  // Convert from/to props to value if provided
  const dateRange = React.useMemo(() => {
    if (value) return value;
    if (date) return date;
    if (from || to) {
      return { from: from, to: to };
    }
    return undefined;
  }, [value, date, from, to]);

  const handleDateChange = (updatedDate: DateRange | undefined) => {
    // Call all handlers to support different naming conventions
    if (onChange) onChange(updatedDate);
    if (onValueChange) onValueChange(updatedDate);
    if (onDateChange) onDateChange(updatedDate);
  };

  return (
    <div className={className}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={"outline"}
            className={`w-full justify-start text-left font-normal ${
              !dateRange?.from && "text-muted-foreground"
            }`}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {dateRange?.from ? (
              dateRange.to ? (
                <>
                  {format(dateRange.from, "dd/MM/yyyy", { locale: ptBR })} -{" "}
                  {format(dateRange.to, "dd/MM/yyyy", { locale: ptBR })}
                </>
              ) : (
                format(dateRange.from, "dd/MM/yyyy", { locale: ptBR })
              )
            ) : (
              <span>Selecione um período</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={dateRange?.from}
            selected={dateRange}
            onSelect={handleDateChange}
            locale={ptBR}
            numberOfMonths={2}
            className="pointer-events-auto"
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}

// Export DatePickerWithRange as an alias for DateRangePicker for backward compatibility
export const DatePickerWithRange = DateRangePicker;
