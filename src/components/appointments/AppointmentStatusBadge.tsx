
import { Badge } from "@/components/ui/badge";

export interface AppointmentStatusBadgeProps {
  status: "scheduled" | "completed" | "canceled";
}

export function AppointmentStatusBadge({ status }: AppointmentStatusBadgeProps) {
  if (status === "completed") {
    return (
      <Badge variant="success">Concluído</Badge>
    );
  }
  
  if (status === "canceled") {
    return (
      <Badge variant="destructive">Cancelado</Badge>
    );
  }
  
  return (
    <Badge variant="outline">Agendado</Badge>
  );
}
