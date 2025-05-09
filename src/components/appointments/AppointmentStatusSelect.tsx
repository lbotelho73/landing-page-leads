
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { appointmentStatusMap, AppointmentStatus } from "./AppointmentStatusBadge";

interface AppointmentStatusSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  includeAll?: boolean;
}

export function AppointmentStatusSelect({
  value,
  onValueChange,
  includeAll = false,
}: AppointmentStatusSelectProps) {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className="w-[180px]">
        <SelectValue placeholder="Filtrar por status" />
      </SelectTrigger>
      <SelectContent>
        {includeAll && (
          <SelectItem value="all">Todos</SelectItem>
        )}
        <SelectItem value="scheduled">{appointmentStatusMap.scheduled.label}</SelectItem>
        <SelectItem value="completed">{appointmentStatusMap.completed.label}</SelectItem>
        <SelectItem value="canceled">{appointmentStatusMap.canceled.label}</SelectItem>
      </SelectContent>
    </Select>
  );
}
