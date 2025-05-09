
import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { ptBR } from '@/lib/i18n';
import { supabase } from "@/integrations/supabase/client";
import { formatDateForSupabase } from '@/integrations/supabase/client';
import { formatCurrency } from "@/lib/format";
import { ReportFilter } from "@/components/reports/ReportFilter";
import { toast } from "sonner";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function ReportsPage() {
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    to: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0),
  });
  const [revenueData, setRevenueData] = useState<any[]>([]);
  const [loadingRevenue, setLoadingRevenue] = useState(true);
  const [professionalData, setProfessionalData] = useState<any[]>([]);
  const [loadingProfessionals, setLoadingProfessionals] = useState(true);
  const [marketingData, setMarketingData] = useState<any[]>([]);
  const [loadingMarketing, setLoadingMarketing] = useState(true);
  
  useEffect(() => {
    fetchRevenueData();
    fetchProfessionalData();
    fetchMarketingData();
  }, [dateRange]);
  
  const fetchRevenueData = async () => {
    setLoadingRevenue(true);
    try {
      const fromDate = formatDateForSupabase(dateRange.from);
      const toDate = formatDateForSupabase(dateRange.to);
      
      const { data, error } = await supabase
        .from('appointments')
        .select('date, is_completed, final_price')
        .gte('date', fromDate)
        .lte('date', toDate)
        .order('date');
        
      if (error) throw error;
      
      // Group by date
      const groupedData = data?.reduce((acc: Record<string, any>, appointment) => {
        const date = appointment.date;
        
        if (!acc[date]) {
          acc[date] = {
            date,
            revenue: 0,
            appointments: 0
          };
        }
        
        acc[date].appointments += 1;
        acc[date].revenue += parseFloat(appointment.final_price) || 0;
        
        return acc;
      }, {});
      
      // Convert to array and sort by date
      const formattedData = Object.values(groupedData || {})
        .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .map((item: any) => ({
          ...item,
          date: new Date(item.date).toLocaleDateString('pt-BR')
        }));
        
      setRevenueData(formattedData);
    } catch (error) {
      console.error("Error fetching revenue data:", error);
      toast.error("Erro ao carregar dados de receita");
    } finally {
      setLoadingRevenue(false);
    }
  };
  
  const fetchProfessionalData = async () => {
    setLoadingProfessionals(true);
    try {
      const fromDate = formatDateForSupabase(dateRange.from);
      const toDate = formatDateForSupabase(dateRange.to);
      
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          primary_professional_id,
          final_price,
          professionals!primary_professional_id (
            first_name,
            last_name,
            commission_percentage
          )
        `)
        .gte('date', fromDate)
        .lte('date', toDate);
        
      if (error) throw error;
      
      // Group by professional
      const groupedData = data?.reduce((acc: Record<string, any>, appointment) => {
        if (!appointment.primary_professional_id || !appointment.professionals) return acc;
        
        const professionalId = appointment.primary_professional_id;
        const professional = appointment.professionals;
        // Access properties correctly from the professional object, not as an array
        const professionalName = `${professional.first_name} ${professional.last_name}`;
        const commissionPercentage = professional.commission_percentage || 0;
        const finalPrice = parseFloat(appointment.final_price) || 0;
        const commission = (finalPrice * commissionPercentage) / 100;
        
        if (!acc[professionalId]) {
          acc[professionalId] = {
            name: professionalName,
            appointments: 0,
            revenue: 0,
            commission: 0
          };
        }
        
        acc[professionalId].appointments += 1;
        acc[professionalId].revenue += finalPrice;
        acc[professionalId].commission += commission;
        
        return acc;
      }, {});
      
      // Convert to array and sort by revenue
      const formattedData = Object.values(groupedData || {})
        .sort((a: any, b: any) => b.revenue - a.revenue);
        
      setProfessionalData(formattedData);
    } catch (error) {
      console.error("Error fetching professional data:", error);
      toast.error("Erro ao carregar dados de profissionais");
    } finally {
      setLoadingProfessionals(false);
    }
  };
  
  const fetchMarketingData = async () => {
    setLoadingMarketing(true);
    try {
      const fromDate = formatDateForSupabase(dateRange.from);
      const toDate = formatDateForSupabase(dateRange.to);
      
      const { data, error } = await supabase.rpc('get_marketing_performance_combined');
        
      if (error) throw error;
      
      // Filter based on date range
      const year = dateRange.from.getFullYear();
      const month = dateRange.from.getMonth() + 1; // JS months are 0-based
      const toYear = dateRange.to.getFullYear();
      const toMonth = dateRange.to.getMonth() + 1;
      
      const filteredData = data?.filter((item: any) => {
        // Check if date is in range
        if (year === toYear) {
          return item.year === year && item.month >= month && item.month <= toMonth;
        } else {
          return (
            (item.year === year && item.month >= month) ||
            (item.year === toYear && item.month <= toMonth) ||
            (item.year > year && item.year < toYear)
          );
        }
      });
      
      // Group by channel
      const groupedData = filteredData?.reduce((acc: Record<string, any>, item: any) => {
        const channelId = item.channel_id;
        
        if (!acc[channelId]) {
          acc[channelId] = {
            name: item.channel_name,
            appointments: 0,
            revenue: 0
          };
        }
        
        acc[channelId].appointments += parseInt(item.total_appointments) || 0;
        acc[channelId].revenue += parseFloat(item.total_revenue) || 0;
        
        return acc;
      }, {});
      
      // Convert to array and sort by revenue
      const formattedData = Object.values(groupedData || {})
        .sort((a: any, b: any) => b.revenue - a.revenue);
        
      setMarketingData(formattedData);
    } catch (error) {
      console.error("Error fetching marketing data:", error);
      toast.error("Erro ao carregar dados de marketing");
    } finally {
      setLoadingMarketing(false);
    }
  };
  
  // Calculate totals
  const totalRevenue = revenueData.reduce((sum, item) => sum + item.revenue, 0);
  const totalAppointments = revenueData.reduce((sum, item) => sum + item.appointments, 0);
  const averageTicket = totalAppointments > 0 ? totalRevenue / totalAppointments : 0;

  return (
    <AppLayout>
      <div className="page-container">
        <h1 className="text-3xl font-bold mb-6">{ptBR.reports}</h1>
        
        <ReportFilter onDateRangeChange={setDateRange} dateRange={dateRange} />
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-lg font-semibold">Receita Total</h3>
            <p className="text-2xl font-bold">{formatCurrency(totalRevenue)}</p>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-lg font-semibold">Atendimentos</h3>
            <p className="text-2xl font-bold">{totalAppointments}</p>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-lg font-semibold">Ticket Médio</h3>
            <p className="text-2xl font-bold">{formatCurrency(averageTicket)}</p>
          </div>
        </div>
        
        <div className="mt-6 grid grid-cols-1 gap-6">
          <div className="bg-white p-4 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Receita Diária</h2>
            {loadingRevenue ? (
              <div className="text-center py-8">{ptBR.loadingData}</div>
            ) : revenueData.length > 0 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={revenueData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip 
                      formatter={(value: number) => formatCurrency(value)}
                      labelFormatter={(label) => `Data: ${label}`}
                    />
                    <Legend />
                    <Bar dataKey="revenue" name="Receita" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">Sem dados para exibir</div>
            )}
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Receita por Profissional</h2>
            {loadingProfessionals ? (
              <div className="text-center py-8">{ptBR.loadingData}</div>
            ) : professionalData.length > 0 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={professionalData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" width={150} />
                    <Tooltip 
                      formatter={(value: number) => formatCurrency(value)}
                    />
                    <Legend />
                    <Bar dataKey="revenue" name="Receita" fill="#82ca9d" />
                    <Bar dataKey="commission" name="Comissão" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">Sem dados para exibir</div>
            )}
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Receita por Canal de Marketing</h2>
            {loadingMarketing ? (
              <div className="text-center py-8">{ptBR.loadingData}</div>
            ) : marketingData.length > 0 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={marketingData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" width={150} />
                    <Tooltip 
                      formatter={(value: number) => formatCurrency(value)}
                    />
                    <Legend />
                    <Bar dataKey="revenue" name="Receita" fill="#ffc658" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">Sem dados para exibir</div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
