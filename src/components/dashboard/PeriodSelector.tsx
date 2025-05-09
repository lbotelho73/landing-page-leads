
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export type TimeRange = "day" | "week" | "month" | "year" | "custom" | "all";

interface PeriodSelectorProps {
  value: TimeRange;
  onChange: (value: TimeRange) => void;
}

export function PeriodSelector({ value, onChange }: PeriodSelectorProps) {
  return (
    <Select value={value} onValueChange={(value: TimeRange) => onChange(value)}>
      <SelectTrigger className="w-[180px]">
        <SelectValue placeholder="Selecione o período" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="day">Hoje</SelectItem>
        <SelectItem value="week">Esta Semana</SelectItem>
        <SelectItem value="month">Este Mês</SelectItem>
        <SelectItem value="year">Este Ano</SelectItem>
        <SelectItem value="all">Todo o Período</SelectItem>
      </SelectContent>
    </Select>
  );
}
