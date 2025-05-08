
import { useState, useEffect, useCallback } from 'react';
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DatePicker } from "@/components/ui/date-picker";
import { CalendarIcon } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { formatDateForSupabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import ptBR from "@/lib/i18n";

export default function ReportsPage() {
  const [startDate, setStartDate] = useState<Date | undefined>(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1); // First day of the current month
  });
  const [endDate, setEndDate] = useState<Date | undefined>(new Date());
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [reports, setReports] = useState<any>(null);
  
  const fetchAppointments = useCallback(async () => {
    if (!startDate || !endDate) return;
    
    setLoading(true);
    try {
      const formattedStartDate = formatDateForSupabase(startDate);
      const formattedEndDate = formatDateForSupabase(endDate);
      
      // Fix: Use explicit foreign key names to avoid ambiguity in relationships
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          id,
          date,
          final_price,
          customer_id,
          service_id,
          primary_professional_id,
          customers (
            first_name,
            last_name,
            referral_source
          ),
          services (
            name,
            duration
          ),
          professionals!primary_professional_id (
            first_name,
            last_name,
            alias_name
          )
        `)
        .gte('date', formattedStartDate)
        .lte('date', formattedEndDate);
        
      if (error) throw error;
      
      setAppointments(data || []);
    } catch (error) {
      console.error('Erro ao buscar agendamentos:', error);
      toast.error('Falha ao carregar agendamentos');
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);
  
  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);
  
  const buildReports = useCallback(() => {
    if (!appointments || appointments.length === 0) {
      setReports(null);
      return;
    }
    
    // Initialize maps to hold aggregated data
    const referralSourceMap = new Map<string, { source: string; appointments: number; revenue: number; customers: Set<string> }>();
    const servicesMap = new Map<string, { name: string; appointments: number; revenue: number; totalDuration: number }>();
    const professionalsMap = new Map<string, { name: string; appointments: number; revenue: number }>();
    
    // Process service data
    appointments.forEach((appointment: any) => {
      if (appointment.services) {
        const serviceId = appointment.service_id || 'unknown';
        const service = appointment.services;
        const serviceName = service?.name || 'Sem Nome';
        const serviceDuration = service?.duration || 0;
        const finalPrice = parseFloat(appointment.final_price) || 0;
        
        if (!servicesMap.has(serviceId)) {
          servicesMap.set(serviceId, {
            name: serviceName,
            appointments: 0,
            revenue: 0,
            totalDuration: 0
          });
        }
        
        const serviceData = servicesMap.get(serviceId)!;
        serviceData.appointments += 1;
        serviceData.revenue += finalPrice;
        serviceData.totalDuration += serviceDuration;
      }
    });

    // Process professional data
    appointments.forEach((appointment: any) => {
      if (appointment.professionals) {
        const professionalId = appointment.primary_professional_id || 'unknown';
        const professional = appointment.professionals;
        
        const professionalName = professional?.alias_name ||
          `${professional?.first_name || ''} ${professional?.last_name || ''}`;
        const finalPrice = parseFloat(appointment.final_price) || 0;
        
        if (!professionalsMap.has(professionalId)) {
          professionalsMap.set(professionalId, {
            name: professionalName,
            appointments: 0,
            revenue: 0
          });
        }
        
        const profData = professionalsMap.get(professionalId)!;
        profData.appointments += 1;
        profData.revenue += finalPrice;
      }
    });

    // Process each appointment for customer data
    appointments.forEach((appointment: any) => {
      const customerId = appointment.customer_id;
      const finalPrice = parseFloat(appointment.final_price) || 0;
      
      // Process customer data
      if (customerId && appointment.customers) {
        const customer = appointment.customers;
        const referralSource = customer?.referral_source || 'Desconhecido';
        
        if (!referralSourceMap.has(referralSource)) {
          referralSourceMap.set(referralSource, {
            source: referralSource,
            appointments: 0,
            revenue: 0,
            customers: new Set()
          });
        }
        
        const sourceData = referralSourceMap.get(referralSource)!;
        sourceData.appointments += 1;
        sourceData.revenue += finalPrice;
        sourceData.customers.add(customerId);
      }
    });
    
    // Convert maps to arrays for easier rendering
    const referralSources = Array.from(referralSourceMap.values());
    const services = Array.from(servicesMap.values());
    const professionals = Array.from(professionalsMap.values());
    
    // Calculate totals
    const totalRevenue = appointments.reduce((sum, appointment) => sum + parseFloat(appointment.final_price || 0), 0);
    const totalAppointments = appointments.length;
    
    // Set the reports state
    setReports({
      totalRevenue,
      totalAppointments,
      referralSources,
      services,
      professionals
    });
  }, [appointments]);
  
  useEffect(() => {
    buildReports();
  }, [buildReports]);
  
  return (
    <AppLayout>
      <div className="page-container">
        <h1 className="text-3xl font-bold mb-6">{ptBR.reports}</h1>
        
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Filtros</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed mb-2">
                Data Inicial
              </label>
              <DatePicker
                selected={startDate}
                onSelect={setStartDate}
                placeholderText="Selecione a data inicial"
                icon={<CalendarIcon className="mr-2 h-4 w-4 opacity-50" />}
              />
            </div>
            <div>
              <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed mb-2">
                Data Final
              </label>
              <DatePicker
                selected={endDate}
                onSelect={setEndDate}
                placeholderText="Selecione a data final"
                icon={<CalendarIcon className="mr-2 h-4 w-4 opacity-50" />}
              />
            </div>
          </CardContent>
        </Card>
        
        {loading ? (
          <div className="text-center py-4">{ptBR.loadingData}</div>
        ) : reports ? (
          <>
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Visão Geral</CardTitle>
              </CardHeader>
              <CardContent>
                <p>Receita Total: R$ {reports.totalRevenue.toFixed(2)}</p>
                <p>Total de Agendamentos: {reports.totalAppointments}</p>
              </CardContent>
            </Card>
            
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Fontes de Referência</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fonte</TableHead>
                      <TableHead>Agendamentos</TableHead>
                      <TableHead>Receita</TableHead>
                      <TableHead>Clientes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reports.referralSources.map((source: any) => (
                      <TableRow key={source.source}>
                        <TableCell>{source.source}</TableCell>
                        <TableCell>{source.appointments}</TableCell>
                        <TableCell>R$ {source.revenue.toFixed(2)}</TableCell>
                        <TableCell>{source.customers.size}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
            
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Serviços</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Serviço</TableHead>
                      <TableHead>Agendamentos</TableHead>
                      <TableHead>Receita</TableHead>
                      <TableHead>Duração Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reports.services.map((service: any) => (
                      <TableRow key={service.name}>
                        <TableCell>{service.name}</TableCell>
                        <TableCell>{service.appointments}</TableCell>
                        <TableCell>R$ {service.revenue.toFixed(2)}</TableCell>
                        <TableCell>{service.totalDuration} min</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
            
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Profissionais</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Profissional</TableHead>
                      <TableHead>Agendamentos</TableHead>
                      <TableHead>Receita</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reports.professionals.map((professional: any) => (
                      <TableRow key={professional.name}>
                        <TableCell>{professional.name}</TableCell>
                        <TableCell>{professional.appointments}</TableCell>
                        <TableCell>R$ {professional.revenue.toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </>
        ) : (
          <div className="text-center py-4">Nenhum dado disponível para o período selecionado.</div>
        )}
      </div>
    </AppLayout>
  );
}
