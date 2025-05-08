
import { useState, useEffect, useCallback } from 'react';
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { format } from 'date-fns';
import { ptBR } from '@/lib/i18n';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { formatDateForSupabase } from '@/integrations/supabase/client';
import { toast } from "sonner";

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
  
  useEffect(() => {
    fetchNewCustomers();
    fetchTodayAppointments();
  }, []);
  
  const fetchNewCustomers = async () => {
    try {
      const today = new Date();
      const formattedDate = formatDateForSupabase(today);
      
      const { data, error, count } = await supabase
        .from('customers')
        .select('*', { count: 'exact' })
        .eq('created_at', formattedDate);
        
      if (error) throw error;
      setNewCustomers(count || 0);
    } catch (error) {
      console.error('Erro ao buscar novos clientes:', error);
    }
  };

  const fetchTodayAppointments = useCallback(async () => {
    setLoadingAppointments(true);
    try {
      const today = new Date();
      const formattedDate = formatDateForSupabase(today);
      
      // Fix: Use explicit foreign key names to avoid ambiguity
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          id,
          time,
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
        .eq('date', formattedDate)
        .order('time');
        
      if (error) throw error;
      console.log("Today's appointments:", data);
      setTodayAppointments(data || []);
    } catch (error) {
      console.error('Error fetching today appointments:', error);
      toast.error('Falha ao carregar agendamentos de hoje');
    } finally {
      setLoadingAppointments(false);
    }
  }, []);

  useEffect(() => {
    if (todayAppointments && todayAppointments.length > 0) {
      // Process the appointments data - accessing nested properties correctly
      const formattedAppointments = todayAppointments.map((apt: any) => {
        // Extract customer name from nested customers object
        const customer = apt.customers;
        const customerName = customer ? 
          `${customer.first_name || ''} ${customer.last_name || ''}` : 
          'Cliente sem agendamento';
          
        // Extract service name from nested services object
        const service = apt.services;
        const serviceName = service ? service.name : 'Serviço não especificado';
        
        // Extract professional name from nested professionals object
        const professional = apt.professionals;
        const professionalName = professional ? 
          `${professional.first_name || ''} ${professional.last_name || ''}` : 
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
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader>
              <CardTitle>{ptBR.customers}</CardTitle>
              <CardDescription>Novos clientes hoje</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{newCustomers}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>{ptBR.appointments}</CardTitle>
              <CardDescription>Agendamentos de hoje</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{todayAppointments.length}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Receita</CardTitle>
              <CardDescription>Receita de hoje</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">R$ 0,00</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Ticket Médio</CardTitle>
              <CardDescription>Ticket médio de hoje</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">R$ 0,00</div>
            </CardContent>
          </Card>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>{ptBR.schedule}</CardTitle>
              <CardDescription>Agenda de hoje</CardDescription>
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
                      {todaySchedule.map((appointment) => (
                        <TableRow key={appointment.id}>
                          <TableCell>{appointment.time}</TableCell>
                          <TableCell className="font-medium">{appointment.clientName}</TableCell>
                          <TableCell>{appointment.serviceName}</TableCell>
                          <TableCell>{appointment.masseuseeName}</TableCell>
                        </TableRow>
                      ))}
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
        
        <Card>
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
