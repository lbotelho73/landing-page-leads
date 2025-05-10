
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface AppointmentStatusSelectProps {
  value: string; 
  onValueChange: (value: string) => void;
  includeAll?: boolean;
}

export function AppointmentStatusSelect({ 
  value, 
  onValueChange, 
  includeAll = false 
}: AppointmentStatusSelectProps) {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder="Filtrar por status" />
      </SelectTrigger>
      <SelectContent>
        {includeAll && <SelectItem value="all">Todos os status</SelectItem>}
        <SelectItem value="pending">Agendados</SelectItem>
        <SelectItem value="completed">Concluídos</SelectItem>
        <SelectItem value="cancelled">Cancelados</SelectItem>
      </SelectContent>
    </Select>
  );
}
