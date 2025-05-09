
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { format } from 'date-fns';
import { ptBR } from '@/lib/i18n';

interface DashboardCalendarProps {
  initialDate?: Date;
  onDateSelected?: (date: Date | undefined) => void;
}

export function DashboardCalendar({ initialDate, onDateSelected }: DashboardCalendarProps) {
  const [date, setDate] = useState<Date | undefined>(initialDate || new Date());

  const handleDateSelect = (newDate: Date | undefined) => {
    setDate(newDate);
    if (onDateSelected) {
      onDateSelected(newDate);
    }
  };

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <CardTitle>Calendário</CardTitle>
        <CardDescription>{ptBR.selectDate}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <Calendar
          mode="single"
          selected={date}
          onSelect={handleDateSelect}
          disabled={(date) =>
            date > new Date() || date < new Date('2023-01-01')
          }
          initialFocus
        />
        {date ? (
          <p>
            Data selecionada: {format(date, 'PPP')}
          </p>
        ) : (
          <p>Por favor, selecione uma data</p>
        )}
      </CardContent>
    </Card>
  );
}
