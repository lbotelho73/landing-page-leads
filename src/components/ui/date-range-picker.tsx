
import * as React from "react"
import { format } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"
import { DateRange } from "react-day-picker"
import { ptBR } from "date-fns/locale"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface DateRangePickerProps {
  value: DateRange | undefined
  onValueChange: (value: DateRange | undefined) => void
  className?: string
  align?: "center" | "start" | "end"
  showAllPeriods?: boolean
  allPeriodsLabel?: string
  onSelectAllPeriods?: () => void
}

export function DateRangePicker({
  value,
  onValueChange,
  className,
  align = "start",
  showAllPeriods = false,
  allPeriodsLabel = "Todo o período",
  onSelectAllPeriods,
}: DateRangePickerProps) {
  return (
    <div className={cn("grid gap-2", className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={"outline"}
            className={cn(
              "w-auto justify-start text-left font-normal",
              !value && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {value?.from ? (
              value.to ? (
                <>
                  {format(value.from, "dd/MM/yyyy")} -{" "}
                  {format(value.to, "dd/MM/yyyy")}
                </>
              ) : (
                format(value.from, "dd/MM/yyyy")
              )
            ) : (
              <span>Selecione as datas</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align={align}>
          {showAllPeriods && (
            <div className="p-3 border-b">
              <Button 
                variant="ghost" 
                className="w-full justify-start" 
                onClick={() => {
                  if (onSelectAllPeriods) {
                    onSelectAllPeriods();
                  }
                }}
              >
                {allPeriodsLabel}
              </Button>
            </div>
          )}
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={value?.from}
            selected={value}
            onSelect={onValueChange}
            numberOfMonths={2}
            locale={ptBR}
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}
