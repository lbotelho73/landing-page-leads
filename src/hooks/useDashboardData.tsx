
import { useState, useEffect, useCallback } from 'react';
import { supabase } from "@/integrations/supabase/client";
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

export function useDashboardData(initialTimeRange: TimeRange = "day", selectedDate?: Date) {
  const [timeRange, setTimeRange] = useState<TimeRange>(initialTimeRange);
  const [dashboardData, setDashboardData] = useState<DashboardData>({
    newCustomers: 0,
    appointments: [],
    scheduledAppointments: [],
    todayRevenue: 0,
    averageTicket: 0,
    loading: true
  });

  // Calculate date range based on selected time range and selectedDate
  const getDateRange = useCallback(() => {
    // Use selectedDate if provided, otherwise use current date
    const baseDate = selectedDate || new Date();
    const today = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate());
    
    let startDate = today;
    let endDate = new Date(today);
    
    if (timeRange === 'day') {
      // For day, use just the selected date
      startDate = today;
      endDate = today;
    } else if (timeRange === 'week') {
      // Get start of the current week (Sunday)
      const day = today.getDay();
      startDate = new Date(today);
      startDate.setDate(today.getDate() - day);
    } else if (timeRange === 'month') {
      // Get start of the current month
      startDate = new Date(today.getFullYear(), today.getMonth(), 1);
      // Set end date to last day of month
      endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    } else if (timeRange === 'year') {
      // Get start of the current year
      startDate = new Date(today.getFullYear(), 0, 1);
      // Set end date to last day of year
      endDate = new Date(today.getFullYear(), 11, 31);
    } else if (timeRange === 'all') {
      // Use a very old date to get all data
      startDate = new Date(2000, 0, 1);
      endDate = new Date(2099, 11, 31);
    }
    
    return { from: startDate, to: endDate };
  }, [timeRange, selectedDate]);

  const fetchNewCustomers = useCallback(async () => {
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
  }, [getDateRange]);

  const fetchAppointments = useCallback(async () => {
    try {
      const dateRange = getDateRange();
      const formattedStartDate = formatDateForSupabase(dateRange.from);
      const formattedEndDate = formatDateForSupabase(dateRange.to);
      
      console.log('Fetching appointments from', formattedStartDate, 'to', formattedEndDate);
      
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
        .gte('date', formattedStartDate)
        .lte('date', formattedEndDate)
        .order('date', { ascending: false })
        .order('time');
        
      if (error) throw error;
      console.log("Appointments fetched:", data?.length || 0, "appointments");
      return data || [];
    } catch (error) {
      console.error('Error fetching appointments:', error);
      toast.error('Falha ao carregar agendamentos');
      return [];
    }
  }, [getDateRange]);

  const fetchRevenueData = useCallback(async () => {
    try {
      const dateRange = getDateRange();
      const formattedStartDate = formatDateForSupabase(dateRange.from);
      const formattedEndDate = formatDateForSupabase(dateRange.to);
      
      console.log('Fetching revenue data from', formattedStartDate, 'to', formattedEndDate);
      
      // Fix: Now ensuring we get proper revenue data by setting an explicit range
      // and not restricting to just completed appointments
      const { data, error } = await supabase
        .from('appointments')
        .select('final_price')
        .gte('date', formattedStartDate)
        .lte('date', formattedEndDate);
        
      if (error) throw error;
      
      console.log("Revenue data fetched:", data?.length || 0, "appointments");
      
      // Calculate total revenue - making sure to properly convert to number
      const totalRevenue = (data || []).reduce((sum, appointment) => {
        const price = parseFloat(appointment.final_price) || 0;
        return sum + price;
      }, 0);
      
      // Calculate average ticket
      const avgTicket = data && data.length > 0 
        ? totalRevenue / data.length 
        : 0;
      
      console.log("Total revenue:", totalRevenue, "Average ticket:", avgTicket);
      
      return { totalRevenue, avgTicket };
    } catch (error) {
      console.error('Error fetching revenue data:', error);
      return { totalRevenue: 0, avgTicket: 0 };
    }
  }, [getDateRange]);

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
          time: apt.date, // Changed from apt.time to apt.date to display date instead of time
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
  }, [fetchAppointments, fetchNewCustomers, fetchRevenueData, processScheduleData]);

  // Effect to load data when timeRange or selectedDate changes
  useEffect(() => {
    fetchData();
  }, [timeRange, selectedDate, fetchData]);

  return {
    ...dashboardData,
    timeRange,
    setTimeRange,
    refreshData: fetchData
  };
}
