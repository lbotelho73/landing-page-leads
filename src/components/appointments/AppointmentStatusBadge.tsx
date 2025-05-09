
import { Badge } from "@/components/ui/badge";

export type AppointmentStatus = "scheduled" | "completed" | "canceled";

export const appointmentStatusMap = {
  scheduled: {
    label: "Agendado",
    variant: "outline" as const,
  },
  completed: {
    label: "Realizado",
    variant: "success" as const,
  },
  canceled: {
    label: "Cancelado",
    variant: "destructive" as const,
  },
};

interface AppointmentStatusBadgeProps {
  status: AppointmentStatus;
}

export function AppointmentStatusBadge({ status }: AppointmentStatusBadgeProps) {
  const statusInfo = appointmentStatusMap[status];
  
  return (
    <Badge variant={statusInfo.variant}>
      {statusInfo.label}
    </Badge>
  );
}
