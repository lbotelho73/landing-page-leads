
import { useState, useEffect, useCallback } from 'react';
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { format } from 'date-fns';
import { ptBR } from '@/lib/i18n';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/lib/supabase";
import { formatDateForSupabase } from '@/integrations/supabase/client';
import { toast } from "sonner";
import { formatCurrency } from "@/lib/format";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Appointment {
  id: string;
  time: string;
  clientName: string;
  serviceName: string;
  masseuseeName: string;
}

export default function DashboardPage() {
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [newCustomers, setNewCustomers] = useState<number>(0);
  const [todayAppointments, setTodayAppointments] = useState<any[]>([]);
  const [todaySchedule, setTodaySchedule] = useState<Appointment[]>([]);
  const [loadingAppointments, setLoadingAppointments] = useState(true);
  const [timeRange, setTimeRange] = useState<"day" | "week" | "month" | "year" | "custom" | "all">("day");
  const [todayRevenue, setTodayRevenue] = useState<number>(0);
  const [averageTicket, setAverageTicket] = useState<number>(0);
  
  // Calculate date range based on selected time range
  const getDateRange = useCallback(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    let startDate = today;
    
    if (timeRange === 'week') {
      // Get start of the current week (Sunday)
      const day = today.getDay();
      startDate = new Date(today);
      startDate.setDate(today.getDate() - day);
    } else if (timeRange === 'month') {
      // Get start of the current month
      startDate = new Date(today.getFullYear(), today.getMonth(), 1);
    } else if (timeRange === 'year') {
      // Get start of the current year
      startDate = new Date(today.getFullYear(), 0, 1);
    } else if (timeRange === 'all') {
      // Use a very old date to get all data
      startDate = new Date(2000, 0, 1);
    }
    
    return { from: startDate, to: new Date() };
  }, [timeRange]);
  
  useEffect(() => {
    fetchData();
  }, [timeRange]);
  
  const fetchData = async () => {
    try {
      await Promise.all([
        fetchNewCustomers(),
        fetchAppointments(),
        fetchRevenueData()
      ]);
    } catch (error) {
      console.error('Erro ao buscar dados do dashboard:', error);
      toast.error('Falha ao carregar dados do dashboard');
    }
  };
  
  const fetchNewCustomers = async () => {
    try {
      const dateRange = getDateRange();
      const formattedStartDate = formatDateForSupabase(dateRange.from);
      const formattedEndDate = formatDateForSupabase(dateRange.to);
      
      const { count, error } = await supabase
        .from('customers')
        .select('*', { count: 'exact' })
        .gte('created_at', formattedStartDate)
        .lte('created_at', formattedEndDate);
        
      if (error) throw error;
      setNewCustomers(count || 0);
    } catch (error) {
      console.error('Erro ao buscar novos clientes:', error);
    }
  };

  const fetchAppointments = useCallback(async () => {
    setLoadingAppointments(true);
    try {
      const dateRange = getDateRange();
      const formattedStartDate = formatDateForSupabase(dateRange.from);
      const formattedEndDate = formatDateForSupabase(dateRange.to);
      
      // Fix: Use explicit foreign key names to avoid ambiguity
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          id,
          date,
          time,
          final_price,
          customer_id,
          service_id,
          primary_professional_id,
          customers (
            first_name,
            last_name
          ),
          services (
            name
          ),
          professionals!primary_professional_id (
            first_name,
            last_name
          )
        `)
        .gte('date', formattedStartDate.split('T')[0])
        .lte('date', formattedEndDate.split('T')[0])
        .order('date', { ascending: false })
        .order('time');
        
      if (error) throw error;
      console.log("Appointments fetched:", data);
      setTodayAppointments(data || []);
    } catch (error) {
      console.error('Error fetching appointments:', error);
      toast.error('Falha ao carregar agendamentos');
    } finally {
      setLoadingAppointments(false);
    }
  }, [getDateRange]);

  const fetchRevenueData = async () => {
    try {
      const dateRange = getDateRange();
      const formattedStartDate = formatDateForSupabase(dateRange.from);
      const formattedEndDate = formatDateForSupabase(dateRange.to);
      
      // Get completed appointments with final price
      const { data, error } = await supabase
        .from('appointments')
        .select('final_price')
        .gte('date', formattedStartDate.split('T')[0])
        .lte('date', formattedEndDate.split('T')[0])
        .eq('is_completed', true);
        
      if (error) throw error;
      
      // Calculate total revenue
      const totalRevenue = (data || []).reduce((sum, appointment) => {
        return sum + Number(appointment.final_price || 0);
      }, 0);
      
      // Calculate average ticket
      const avgTicket = data && data.length > 0 
        ? totalRevenue / data.length 
        : 0;
      
      setTodayRevenue(totalRevenue);
      setAverageTicket(avgTicket);
      
    } catch (error) {
      console.error('Error fetching revenue data:', error);
    }
  };

  useEffect(() => {
    if (todayAppointments && todayAppointments.length > 0) {
      // Process the appointments data - accessing nested properties correctly
      const formattedAppointments = todayAppointments.map((apt: any) => {
        // Extract customer name from nested customers object
        const customer = apt.customers;
        const customerName = customer ? 
          `${customer.first_name || ''} ${customer.last_name || ''}`.trim() : 
          'Cliente sem agendamento';
          
        // Extract service name from nested services object
        const service = apt.services;
        const serviceName = service ? service.name : 'Serviço não especificado';
        
        // Extract professional name from nested professionals object
        const professional = apt.professionals;
        const professionalName = professional ? 
          `${professional.first_name || ''} ${professional.last_name || ''}`.trim() : 
          'Profissional não atribuído';
          
        return {
          id: apt.id,
          time: apt.time,
          clientName: customerName,
          serviceName: serviceName,
          masseuseeName: professionalName
        };
      });
      
      setTodaySchedule(formattedAppointments);
    } else {
      setTodaySchedule([]);
    }
  }, [todayAppointments]);
  
  return (
    <AppLayout>
      <div className="page-container">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">{ptBR.dashboard}</h1>
          
          <div>
            <Select value={timeRange} onValueChange={(value: "day" | "week" | "month" | "year" | "custom" | "all") => setTimeRange(value)}>
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
          </div>
        </div>
        
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
              <div className="text-2xl font-bold">{todayAppointments.length}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Receita</CardTitle>
              <CardDescription>Receita do período</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(todayRevenue)}</div>
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
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>{ptBR.schedule}</CardTitle>
              <CardDescription>Agenda do período</CardDescription>
            </CardHeader>
            <CardContent className="h-[400px]">
              {loadingAppointments ? (
                <div className="text-center py-4">{ptBR.loadingData}</div>
              ) : (
                <ScrollArea className="h-full w-full rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{ptBR.time}</TableHead>
                        <TableHead>{ptBR.client}</TableHead>
                        <TableHead>{ptBR.services}</TableHead>
                        <TableHead>{ptBR.professional}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {todaySchedule.length > 0 ? (
                        todaySchedule.map((appointment) => (
                          <TableRow key={appointment.id}>
                            <TableCell>{appointment.time}</TableCell>
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
          
          <Card className="flex flex-col">
            <CardHeader>
              <CardTitle>Calendário</CardTitle>
              <CardDescription>{ptBR.selectDate}</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <Calendar
                mode="single"
                selected={date}
                onSelect={setDate}
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
        </div>
        
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Equipe</CardTitle>
            <CardDescription>Membros da equipe</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-4">
              <Avatar>
                <AvatarImage src="https://github.com/shadcn.png" alt="@shadcn" />
                <AvatarFallback>CN</AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-medium leading-none">shadcn</p>
                <p className="text-sm text-muted-foreground">
                  shadcn@example.com
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
