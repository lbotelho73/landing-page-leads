
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ptBR } from '@/lib/i18n';
import { format, parseISO } from 'date-fns';
import { ptBR as ptBRLocale } from 'date-fns/locale';

export interface Appointment {
  id: string;
  time: string; // This now actually contains the date
  clientName: string;
  serviceName: string;
  masseuseeName: string;
}

interface AppointmentsScheduleProps {
  appointments: Appointment[];
  loading: boolean;
}

export function AppointmentsSchedule({ appointments, loading }: AppointmentsScheduleProps) {
  // Format date function
  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    
    try {
      const date = new Date(dateString);
      return format(date, 'dd/MM/yyyy', { locale: ptBRLocale });
    } catch (error) {
      console.error('Error formatting date:', error);
      return dateString;
    }
  };

  return (
    <Card className="lg:col-span-2">
      <CardHeader>
        <CardTitle>{ptBR.schedule}</CardTitle>
        <CardDescription>Agenda do período</CardDescription>
      </CardHeader>
      <CardContent className="h-[400px]">
        {loading ? (
          <div className="text-center py-4">{ptBR.loadingData}</div>
        ) : (
          <ScrollArea className="h-full w-full rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>{ptBR.client}</TableHead>
                  <TableHead>{ptBR.services}</TableHead>
                  <TableHead>{ptBR.professional}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {appointments.length > 0 ? (
                  appointments.map((appointment) => (
                    <TableRow key={appointment.id}>
                      <TableCell>{formatDate(appointment.time)}</TableCell>
                      <TableCell className="font-medium">{appointment.clientName}</TableCell>
                      <TableCell>{appointment.serviceName}</TableCell>
                      <TableCell>{appointment.masseuseeName}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-4 text-muted-foreground">
                      Nenhum agendamento para o período selecionado
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
