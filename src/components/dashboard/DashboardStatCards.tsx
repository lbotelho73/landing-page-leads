
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/format";
import { ptBR } from '@/lib/i18n';

interface DashboardStatCardsProps {
  newCustomers: number;
  appointmentsCount: number;
  revenue: number;
  averageTicket: number;
}

export function DashboardStatCards({
  newCustomers,
  appointmentsCount,
  revenue,
  averageTicket
}: DashboardStatCardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <Card>
        <CardHeader>
          <CardTitle>{ptBR.customers}</CardTitle>
          <CardDescription>Novos clientes</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{newCustomers}</div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>{ptBR.appointments}</CardTitle>
          <CardDescription>Agendamentos</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{appointmentsCount}</div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Receita</CardTitle>
          <CardDescription>Receita do período</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(revenue)}</div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Ticket Médio</CardTitle>
          <CardDescription>Ticket médio do período</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(averageTicket)}</div>
        </CardContent>
      </Card>
    </div>
  );
}
