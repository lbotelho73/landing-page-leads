
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from 'date-fns';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { formatCurrency } from '@/lib/format';
import { DateRange } from 'react-day-picker';

interface ChannelData {
  channel_name: string;
  total_appointments: number;
  total_revenue: number;
  month: number;
  year: number;
}

// Define interface for monthly chart data
interface MonthlyDataItem {
  name: string;
  month: string;
  total: number;
  [key: string]: number | string; // Allow dynamic channel names as properties
}

export function PerformanceAnalysis() {
  const [performanceData, setPerformanceData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [chartData, setChartData] = useState<any[]>([]);
  const [dateRange, setDateRange] = useState<DateRange>({
    from: new Date(new Date().getFullYear(), new Date().getMonth() - 5, 1),
    to: new Date()
  });

  useEffect(() => {
    fetchPerformanceData();
  }, [dateRange]);

  const fetchPerformanceData = async () => {
    setLoading(true);
    try {
      const startMonth = dateRange.from ? dateRange.from.getMonth() + 1 : new Date().getMonth() - 5 + 1;
      const startYear = dateRange.from ? dateRange.from.getFullYear() : new Date().getFullYear();
      const endMonth = dateRange.to ? dateRange.to.getMonth() + 1 : new Date().getMonth() + 1;
      const endYear = dateRange.to ? dateRange.to.getFullYear() : new Date().getFullYear();

      // Use the rpc function to get combined marketing performance
      const { data, error } = await supabase.rpc('get_marketing_performance_combined');

      if (error) throw error;

      // Filter data based on date range and ensure numeric types
      const filteredData = (data || []).filter((item: any) => {
        // Convert string values to numbers if needed
        const itemMonth = typeof item.month === 'string' ? parseInt(item.month, 10) : Number(item.month);
        const itemYear = typeof item.year === 'string' ? parseInt(item.year, 10) : Number(item.year);
        const itemDate = new Date(itemYear, itemMonth - 1, 1);
        return itemDate >= new Date(startYear, startMonth - 1, 1) && 
               itemDate <= new Date(endYear, endMonth - 1, 1);
      }).map((item: any) => ({
        ...item,
        // Ensure month and year are converted to numbers
        month: typeof item.month === 'string' ? parseInt(item.month, 10) : Number(item.month),
        year: typeof item.year === 'string' ? parseInt(item.year, 10) : Number(item.year)
      }));

      setPerformanceData(filteredData);
      processChartData(filteredData);
    } catch (error) {
      console.error('Error fetching performance data:', error);
      toast.error('Falha ao carregar dados de performance');
    } finally {
      setLoading(false);
    }
  };

  const processChartData = (data: ChannelData[]) => {
    if (!data || data.length === 0) {
      setChartData([]);
      return;
    }

    // Group by month/year
    const monthlyData: Record<string, MonthlyDataItem> = {};
    
    data.forEach(item => {
      // Ensure month and year are numbers, not strings
      const month = Number(item.month);
      const year = Number(item.year);
      
      const monthYear = `${year}-${month.toString().padStart(2, '0')}`;
      
      if (!monthlyData[monthYear]) {
        monthlyData[monthYear] = {
          name: monthYear,
          month: format(new Date(year, month - 1, 1), 'MMM/yy'),
          total: 0
        };
      }
      
      // Add revenue for this channel - ensure it's a number
      const revenue = typeof item.total_revenue === 'string' ? 
        Number(item.total_revenue) : item.total_revenue;
      
      monthlyData[monthYear][item.channel_name] = revenue;
      
      // Add to total - ensure we're adding numbers
      const currentTotal = monthlyData[monthYear].total || 0;
      monthlyData[monthYear].total = currentTotal + revenue;
    });
    
    // Sort by date
    const sortedData = Object.values(monthlyData).sort((a: any, b: any) => {
      return a.name.localeCompare(b.name);
    });
    
    setChartData(sortedData);
  };

  const getChannelNames = () => {
    const channelSet = new Set<string>();
    performanceData.forEach(item => {
      channelSet.add(item.channel_name);
    });
    return Array.from(channelSet);
  };

  const getColorForChannel = (channel: string) => {
    // Hash the channel name to get a consistent color
    let hash = 0;
    for (let i = 0; i < channel.length; i++) {
      hash = channel.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    // Generate color from hash
    const c = (hash & 0x00FFFFFF)
      .toString(16)
      .toUpperCase()
      .padStart(6, '0');
    
    return `#${c}`;
  };

  const getTotalRevenue = () => {
    return performanceData.reduce((sum, item) => sum + item.total_revenue, 0);
  };

  const getTotalAppointments = () => {
    return performanceData.reduce((sum, item) => sum + item.total_appointments, 0);
  };

  const getChannelTotals = () => {
    const totals: Record<string, { revenue: number, appointments: number }> = {};
    
    performanceData.forEach(item => {
      if (!totals[item.channel_name]) {
        totals[item.channel_name] = { revenue: 0, appointments: 0 };
      }
      
      totals[item.channel_name].revenue += item.total_revenue;
      totals[item.channel_name].appointments += item.total_appointments;
    });
    
    return Object.entries(totals)
      .map(([channel, data]) => ({ 
        channel, 
        ...data,
        percentage: (data.revenue / getTotalRevenue()) * 100
      }))
      .sort((a, b) => b.revenue - a.revenue);
  };

  const channelNames = getChannelNames();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Período de Análise</CardTitle>
          <CardDescription>Selecione um período para analisar o desempenho dos canais</CardDescription>
        </CardHeader>
        <CardContent>
          <DateRangePicker 
            value={dateRange} 
            onValueChange={setDateRange} 
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Visão Geral</CardTitle>
          <CardDescription>
            Performance dos canais de marketing no período selecionado
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Carregando dados...</div>
          ) : performanceData.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum dado disponível para o período selecionado
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold">
                      {formatCurrency(getTotalRevenue())}
                    </div>
                    <p className="text-muted-foreground">Receita Total</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold">{getTotalAppointments()}</div>
                    <p className="text-muted-foreground">Agendamentos</p>
                  </CardContent>
                </Card>
              </div>

              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-4">Receita por Mês</h3>
                <div className="h-[400px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={chartData}
                      margin={{ top: 20, right: 30, left: 20, bottom: 70 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="month"
                        angle={-45}
                        textAnchor="end"
                        height={70}
                      />
                      <YAxis 
                        tickFormatter={(value) => `R$${value}`}
                      />
                      <Tooltip 
                        formatter={(value) => [`R$ ${value}`, undefined]}
                        labelFormatter={(label) => `Mês: ${label}`}
                      />
                      <Legend />
                      {channelNames.map(channel => (
                        <Bar 
                          key={channel} 
                          dataKey={channel} 
                          name={channel}
                          fill={getColorForChannel(channel)} 
                          stackId="revenue"
                        />
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-4">Desempenho por Canal</h3>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2">Canal</th>
                        <th className="text-right py-2">Agendamentos</th>
                        <th className="text-right py-2">Receita</th>
                        <th className="text-right py-2">% do Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {getChannelTotals().map(({ channel, revenue, appointments, percentage }) => (
                        <tr key={channel} className="border-b">
                          <td className="py-2">{channel}</td>
                          <td className="text-right py-2">{appointments}</td>
                          <td className="text-right py-2">{formatCurrency(revenue)}</td>
                          <td className="text-right py-2">{percentage.toFixed(2)}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
