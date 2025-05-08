
"use client"

import * as React from "react"
import { format } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

export interface DatePickerProps {
  selected?: Date
  onSelect?: (date: Date | undefined) => void
  placeholderText?: string
  icon?: React.ReactNode
  disabled?: boolean
}

export function DatePicker({
  selected,
  onSelect,
  placeholderText = "Select date",
  icon,
  disabled,
}: DatePickerProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant={"outline"}
          className={cn(
            "w-full pl-3 text-left font-normal flex justify-between items-center",
            !selected && "text-muted-foreground"
          )}
          disabled={disabled}
        >
          {selected ? format(selected, "PPP") : <span>{placeholderText}</span>}
          {icon || <CalendarIcon className="h-4 w-4 opacity-50 ml-auto" />}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selected}
          onSelect={onSelect}
          initialFocus
          className={cn("p-3 pointer-events-auto")}
        />
      </PopoverContent>
    </Popover>
  )
}
