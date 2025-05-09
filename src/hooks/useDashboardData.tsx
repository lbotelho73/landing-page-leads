
import { useState, useEffect, useCallback } from 'react';
import { supabase } from "@/lib/supabase";
import { formatDateForSupabase } from '@/integrations/supabase/client';
import { toast } from "sonner";
import { Appointment } from '@/components/dashboard/AppointmentsSchedule';

export type TimeRange = "day" | "week" | "month" | "year" | "custom" | "all";

export interface DashboardData {
  newCustomers: number;
  appointments: any[];
  scheduledAppointments: Appointment[];
  todayRevenue: number;
  averageTicket: number;
  loading: boolean;
}

export function useDashboardData(initialTimeRange: TimeRange = "day") {
  const [timeRange, setTimeRange] = useState<TimeRange>(initialTimeRange);
  const [dashboardData, setDashboardData] = useState<DashboardData>({
    newCustomers: 0,
    appointments: [],
    scheduledAppointments: [],
    todayRevenue: 0,
    averageTicket: 0,
    loading: true
  });

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
      return count || 0;
    } catch (error) {
      console.error('Erro ao buscar novos clientes:', error);
      return 0;
    }
  };

  const fetchAppointments = useCallback(async () => {
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
      return data || [];
    } catch (error) {
      console.error('Error fetching appointments:', error);
      toast.error('Falha ao carregar agendamentos');
      return [];
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
      
      return { totalRevenue, avgTicket };
    } catch (error) {
      console.error('Error fetching revenue data:', error);
      return { totalRevenue: 0, avgTicket: 0 };
    }
  };

  // Process appointments into schedule format
  const processScheduleData = useCallback((appointments: any[]) => {
    if (appointments && appointments.length > 0) {
      // Process the appointments data - accessing nested properties correctly
      return appointments.map((apt: any) => {
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
    }
    return [];
  }, []);

  const fetchData = useCallback(async () => {
    setDashboardData(prev => ({ ...prev, loading: true }));
    try {
      const [newCustomersCount, appointments, revenueData] = await Promise.all([
        fetchNewCustomers(),
        fetchAppointments(),
        fetchRevenueData()
      ]);
      
      const scheduledAppointments = processScheduleData(appointments);
      
      setDashboardData({
        newCustomers: newCustomersCount,
        appointments: appointments,
        scheduledAppointments: scheduledAppointments,
        todayRevenue: revenueData.totalRevenue,
        averageTicket: revenueData.avgTicket,
        loading: false
      });
    } catch (error) {
      console.error('Erro ao buscar dados do dashboard:', error);
      toast.error('Falha ao carregar dados do dashboard');
      setDashboardData(prev => ({ ...prev, loading: false }));
    }
  }, [fetchAppointments, processScheduleData]);

  // Effect to load data when timeRange changes
  useEffect(() => {
    fetchData();
  }, [timeRange, fetchData]);

  return {
    ...dashboardData,
    timeRange,
    setTimeRange,
    refreshData: fetchData
  };
}
