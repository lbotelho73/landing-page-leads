
import { useState, useEffect, useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/format";
import ptBR from "@/lib/i18n";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { Button } from "@/components/ui/button";
import { format, subDays, startOfDay, endOfDay, subMonths, subWeeks, subYears } from "date-fns";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { DateRange } from "react-day-picker";
import { 
  BarChart, 
  PieChart, 
  Bar, 
  Cell, 
  ResponsiveContainer, 
  Pie, 
  Legend, 
  Tooltip, 
  XAxis, 
  YAxis 
} from "recharts";

interface ChannelData {
  name: string;
  revenue: number;
  clients: number;
}

interface ProfessionalData {
  name: string;
  revenue: number;
  clients: number;
}

interface ServiceData {
  name: string;
  revenue: number;
  clients: number;
}

export default function MarketingPage() {
  const [timeRange, setTimeRange] = useState<"day" | "week" | "month" | "year" | "custom" | "all">("month");
  const [loading, setLoading] = useState(true);
  const [channelData, setChannelData] = useState<ChannelData[]>([]);
  const [professionalData, setProfessionalData] = useState<ProfessionalData[]>([]);
  const [serviceData, setServiceData] = useState<ServiceData[]>([]);
  const [dateRange, setDateRange] = useState<DateRange>({
    from: subMonths(new Date(), 1),
    to: new Date()
  });
  const [error, setError] = useState<string | null>(null);
  
  // Calculate date range based on selected time range
  const calculatedDateRange = useMemo(() => {
    const now = new Date();
    const end = endOfDay(now);
    let start = startOfDay(now);
    
    if (timeRange === 'day') {
      start = startOfDay(now);
    } else if (timeRange === 'week') {
      start = startOfDay(subWeeks(now, 1));
    } else if (timeRange === 'month') {
      start = startOfDay(subMonths(now, 1));
    } else if (timeRange === 'year') {
      // Fix: Use the current year only (start from January 1st of current year)
      const currentYear = now.getFullYear();
      start = startOfDay(new Date(currentYear, 0, 1));
    } else if (timeRange === 'custom' && dateRange?.from) {
      start = startOfDay(dateRange.from);
      // Use end of day for the "to" date to include the full day
      return {
        start: start,
        end: dateRange.to ? endOfDay(dateRange.to) : endOfDay(now)
      };
    } else if (timeRange === 'all') {
      // Set a very old date to get all data
      start = startOfDay(new Date(2000, 0, 1));
    }
    
    return {
      start: start,
      end: end
    };
  }, [timeRange, dateRange]);
  
  useEffect(() => {
    fetchData();
  }, [timeRange, dateRange]);
  
  const fetchData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log("Fetching marketing data with date range:", {
        start: calculatedDateRange.start.toISOString(),
        end: calculatedDateRange.end.toISOString(),
        timeRange: timeRange
      });
      
      // Fetch appointments within the time range using the updated view
      // that combines marketing channels from both appointments and customers
      let query = supabase
        .from('appointments')
        .select(`
          id,
          date,
          final_price,
          customer_id,
          primary_professional_id,
          service_id,
          marketing_channel_id,
          customers(id, referral_source)
        `);

      // Only add date filters if not "all" period
      if (timeRange !== 'all') {
        query = query.gte('date', format(calculatedDateRange.start, 'yyyy-MM-dd'))
                     .lte('date', format(calculatedDateRange.end, 'yyyy-MM-dd'));
      }

      const { data: appointments, error: appointmentsError } = await query;
      
      if (appointmentsError) {
        console.error("Error fetching appointments:", appointmentsError);
        setError("Erro ao buscar agendamentos");
        throw appointmentsError;
      }
      
      console.log(`Fetched ${appointments?.length || 0} appointments`, appointments);
      
      // Fetch marketing channels
      const { data: channels, error: channelsError } = await supabase
        .from('marketing_channels')
        .select('id, name, description');
      
      if (channelsError) {
        console.error("Error fetching channels:", channelsError);
        setError("Erro ao buscar canais de marketing");
        throw channelsError;
      }
      
      console.log("Fetched marketing channels:", channels);
      
      // Fetch marketing performance data for the time range
      let performanceQuery = supabase
        .from('marketing_performance')
        .select('*');
      
      if (timeRange !== 'all') {
        // Convert JS month (0-11) to SQL month (1-12)
        const startMonth = calculatedDateRange.start.getMonth() + 1;
        const endMonth = calculatedDateRange.end.getMonth() + 1;
        const startYear = calculatedDateRange.start.getFullYear();
        const endYear = calculatedDateRange.end.getFullYear();
        
        performanceQuery = performanceQuery
          .or(`year.gt.${startYear-1},and(year.eq.${startYear},month.gte.${startMonth})`)
          .or(`year.lt.${endYear+1},and(year.eq.${endYear},month.lte.${endMonth})`);
      }
      
      const { data: performanceData, error: performanceError } = await performanceQuery;
      
      if (performanceError) {
        console.error("Error fetching marketing performance:", performanceError);
        setError("Erro ao buscar dados de performance de marketing");
        // Continue with other data even if this fails
      } else {
        console.log("Fetched marketing performance data:", performanceData);
      }
      
      // Fetch all professionals
      const { data: professionals, error: professionalsError } = await supabase
        .from('professionals')
        .select('id, first_name, last_name, alias_name');
      
      if (professionalsError) {
        console.error("Error fetching professionals:", professionalsError);
        setError("Erro ao buscar profissionais");
        throw professionalsError;
      }
      
      // Fetch all services
      const { data: services, error: servicesError } = await supabase
        .from('services')
        .select('id, name');
      
      if (servicesError) {
        console.error("Error fetching services:", servicesError);
        setError("Erro ao buscar serviços");
        throw servicesError;
      }
      
      // Process channel data
      const channelStats: Record<string, { name: string, revenue: number, clients: Set<string> }> = {};
      
      // Initialize with all marketing channels
      channels?.forEach(channel => {
        channelStats[channel.id] = {
          name: channel.name,
          revenue: 0,
          clients: new Set()
        };
      });
      
      // Add "Not specified" channel for appointments without marketing channel
      channelStats['not_specified'] = {
        name: "Não especificado",
        revenue: 0,
        clients: new Set()
      };
      
      // Process professional data
      const professionalStats: Record<string, { name: string, revenue: number, clients: Set<string> }> = {};
      
      professionals?.forEach(professional => {
        const fullName = professional.alias_name || `${professional.first_name} ${professional.last_name}`;
        professionalStats[professional.id] = {
          name: fullName,
          revenue: 0,
          clients: new Set()
        };
      });
      
      // Process service data
      const serviceStats: Record<string, { name: string, revenue: number, clients: Set<string> }> = {};
      
      services?.forEach(service => {
        serviceStats[service.id] = {
          name: service.name,
          revenue: 0,
          clients: new Set()
        };
      });
      
      // Process appointments
      if (appointments && appointments.length > 0) {
        appointments.forEach(appointment => {
          const customerId = appointment.customer_id;
          const finalPrice = Number(appointment.final_price) || 0;
          
          // Update channel stats
          if (appointment.marketing_channel_id && channelStats[appointment.marketing_channel_id]) {
            channelStats[appointment.marketing_channel_id].revenue += finalPrice;
            if (customerId) {
              channelStats[appointment.marketing_channel_id].clients.add(customerId);
            }
          } else {
            // If appointment has customer with referral_source, try to match with a marketing channel
            // The customers property returns an object, not an array
            // Fix: TypeScript doesn't correctly infer the type, so we need to use proper type assertions
            const customerData = appointment.customers as unknown as { id: string; referral_source: string } | null;
            const referralSource = customerData ? customerData.referral_source : null;
            
            if (referralSource) {
              // Find a channel that matches the referral source
              const matchingChannel = channels?.find(channel => 
                channel.name.toLowerCase() === referralSource.toLowerCase()
              );
              
              if (matchingChannel) {
                channelStats[matchingChannel.id].revenue += finalPrice;
                if (customerId) {
                  channelStats[matchingChannel.id].clients.add(customerId);
                }
              } else {
                // No matching channel found, add to "Not specified"
                channelStats['not_specified'].revenue += finalPrice;
                if (customerId) {
                  channelStats['not_specified'].clients.add(customerId);
                }
              }
            } else {
              // No marketing channel and no referral source
              channelStats['not_specified'].revenue += finalPrice;
              if (customerId) {
                channelStats['not_specified'].clients.add(customerId);
              }
            }
          }
          
          // Update professional stats
          if (appointment.primary_professional_id && professionalStats[appointment.primary_professional_id]) {
            professionalStats[appointment.primary_professional_id].revenue += finalPrice;
            if (customerId) {
              professionalStats[appointment.primary_professional_id].clients.add(customerId);
            }
          }
          
          // Update service stats
          if (appointment.service_id && serviceStats[appointment.service_id]) {
            serviceStats[appointment.service_id].revenue += finalPrice;
            if (customerId) {
              serviceStats[appointment.service_id].clients.add(customerId);
            }
          }
        });
      }
      
      // Also incorporate data from the marketing_performance view if available
      if (performanceData && performanceData.length > 0) {
        performanceData.forEach(performance => {
          if (performance.channel_id && channelStats[performance.channel_id]) {
            // We don't have individual client counts from the view, so we just add the revenue
            channelStats[performance.channel_id].revenue += Number(performance.total_revenue) || 0;
            // For client count, we just log that we don't have this info
            console.log(`Added ${performance.total_revenue} revenue to channel ${performance.channel_name} from performance data`);
          }
        });
      }
      
      // Convert to array format
      const channelDataArray = Object.values(channelStats)
        .filter(item => item.revenue > 0 || item.clients.size > 0) // Only include channels with data
        .map(stats => ({
          name: stats.name,
          revenue: stats.revenue,
          clients: stats.clients.size
        }));
      
      const professionalDataArray = Object.values(professionalStats)
        .filter(item => item.revenue > 0 || item.clients.size > 0) // Only include professionals with data
        .map(stats => ({
          name: stats.name,
          revenue: stats.revenue,
          clients: stats.clients.size
        }));
      
      const serviceDataArray = Object.values(serviceStats)
        .filter(item => item.revenue > 0 || item.clients.size > 0) // Only include services with data
        .map(stats => ({
          name: stats.name,
          revenue: stats.revenue,
          clients: stats.clients.size
        }));
      
      // Sort by revenue (descending)
      channelDataArray.sort((a, b) => b.revenue - a.revenue);
      professionalDataArray.sort((a, b) => b.revenue - a.revenue);
      serviceDataArray.sort((a, b) => b.revenue - a.revenue);
      
      console.log("Channel data:", channelDataArray);
      console.log("Professional data:", professionalDataArray);
      console.log("Service data:", serviceDataArray);
      
      // Update state
      setChannelData(channelDataArray);
      setProfessionalData(professionalDataArray);
      setServiceData(serviceDataArray);
    } catch (error) {
      console.error("Error fetching marketing data:", error);
      toast.error("Erro ao carregar dados de marketing");
    } finally {
      setLoading(false);
    }
  };
  
  const totalRevenue = channelData.reduce((sum, item) => sum + item.revenue, 0);
  const totalClients = channelData.reduce((sum, item) => sum + item.clients, 0);
  
  const getTimeRangeLabel = () => {
    switch (timeRange) {
      case "day": return "Hoje";
      case "week": return "Esta semana";
      case "month": return "Este mês";
      case "year": return "Este ano";
      case "all": return "Todo o período";
      case "custom": 
        if (dateRange?.from) {
          const fromDate = format(dateRange.from, 'dd/MM/yyyy');
          const toDate = dateRange.to ? format(dateRange.to, 'dd/MM/yyyy') : format(new Date(), 'dd/MM/yyyy');
          return `${fromDate} a ${toDate}`;
        }
        return "Período personalizado";
      default: return "";
    }
  };

  const chartColors = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#a63c91', '#0c548c', '#e63946', '#5e548e', '#00b4d8'];
  
  return <AppLayout>
      <div className="page-container">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <h1 className="text-3xl font-bold">Análise de Marketing</h1>
          
          <div className="flex flex-col sm:flex-row gap-2">
            <Select value={timeRange} onValueChange={(value: "day" | "week" | "month" | "year" | "custom" | "all") => setTimeRange(value)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="day">Hoje</SelectItem>
                <SelectItem value="week">Esta Semana</SelectItem>
                <SelectItem value="month">Este Mês</SelectItem>
                <SelectItem value="year">Este Ano</SelectItem>
                <SelectItem value="all">Todo o Período</SelectItem>
                <SelectItem value="custom">Período Personalizado</SelectItem>
              </SelectContent>
            </Select>
            
            {timeRange === 'custom' && (
              <div className="flex gap-2">
                <DateRangePicker 
                  value={dateRange}
                  onValueChange={setDateRange}
                />
                
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={fetchData}
                >
                  Filtrar
                </Button>
              </div>
            )}
          </div>
        </div>
        
        {error ? (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
        
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Faturamento Total</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totalRevenue)}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {getTimeRangeLabel()}
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Clientes Atendidos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalClients}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {getTimeRangeLabel()}
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Canal Top</CardTitle>
            </CardHeader>
            <CardContent>
              {channelData.length > 0 ? (
                <>
                  <div className="text-2xl font-bold">{channelData[0].name}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatCurrency(channelData[0].revenue)} em faturamento
                  </p>
                </>
              ) : (
                <div className="text-sm text-muted-foreground">Sem dados</div>
              )}
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Profissional Top</CardTitle>
            </CardHeader>
            <CardContent>
              {professionalData.length > 0 ? (
                <>
                  <div className="text-2xl font-bold">{professionalData[0].name}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatCurrency(professionalData[0].revenue)} em faturamento
                  </p>
                </>
              ) : (
                <div className="text-sm text-muted-foreground">Sem dados</div>
              )}
            </CardContent>
          </Card>
        </div>
        
        <div className="mt-8">
          <Tabs defaultValue="channels">
            <TabsList className="grid grid-cols-3 w-full max-w-md mb-6">
              <TabsTrigger value="channels">Canais</TabsTrigger>
              <TabsTrigger value="professionals">Profissionais</TabsTrigger>
              <TabsTrigger value="services">Massagens</TabsTrigger>
            </TabsList>
            
            <TabsContent value="channels">
              <Card>
                <CardHeader>
                  <CardTitle>Faturamento por Canal de Marketing</CardTitle>
                  <CardDescription>Veja quais canais de marketing estão trazendo mais faturamento</CardDescription>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="h-80 bg-muted/30 rounded-md flex items-center justify-center">
                      Carregando dados...
                    </div>
                  ) : channelData.length > 0 ? (
                    <div className="space-y-8">
                      <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={channelData.map((channel, index) => ({
                                name: channel.name,
                                value: channel.revenue
                              }))}
                              dataKey="value"
                              nameKey="name"
                              cx="50%"
                              cy="50%"
                              outerRadius={100}
                              fill="#8884d8"
                              label={({name, percent}) => `${name}: ${(percent * 100).toFixed(1)}%`}
                            >
                              {channelData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={chartColors[index % chartColors.length]} />
                              ))}
                            </Pie>
                            <Tooltip formatter={(value) => formatCurrency(value as number)} />
                            <Legend />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      
                      <div className="space-y-6">
                        {channelData.map((channel, index) => (
                          <div key={channel.name} className="space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center">
                                <div className={`w-4 h-4 rounded-full`} style={{backgroundColor: chartColors[index % chartColors.length]}}></div>
                                <span className="ml-2">{channel.name}</span>
                              </div>
                              <div className="font-medium">
                                {formatCurrency(channel.revenue)}
                              </div>
                            </div>
                            <div className="h-2 bg-muted rounded-full">
                              <div 
                                className="h-full rounded-full" 
                                style={{
                                  backgroundColor: chartColors[index % chartColors.length],
                                  width: `${totalRevenue > 0 ? (channel.revenue / totalRevenue * 100) : 0}%`
                                }}
                              ></div>
                            </div>
                            <div className="flex justify-between text-xs text-muted-foreground">
                              <span>{channel.clients} clientes</span>
                              <span>{totalRevenue > 0 ? Math.round(channel.revenue / totalRevenue * 100) : 0}%</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="h-40 flex items-center justify-center text-muted-foreground">
                      Nenhum dado encontrado para o período selecionado
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="professionals">
              <Card>
                <CardHeader>
                  <CardTitle>Faturamento por Profissional</CardTitle>
                  <CardDescription>Veja quais profissionais estão gerando mais faturamento</CardDescription>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="h-80 bg-muted/30 rounded-md flex items-center justify-center">
                      Carregando dados...
                    </div>
                  ) : professionalData.length > 0 ? (
                    <div className="space-y-8">
                      <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                          {professionalData.length > 0 ? (
                            <BarChart
                              data={professionalData.slice(0, 10).map((prof, index) => ({
                                name: prof.name,
                                revenue: prof.revenue
                              }))}
                              layout="vertical"
                              margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
                            >
                              <XAxis type="number" />
                              <YAxis type="category" dataKey="name" width={100} />
                              <Tooltip formatter={(value) => formatCurrency(value as number)} />
                              <Bar dataKey="revenue" fill="#8884d8">
                                {professionalData.slice(0, 10).map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={chartColors[index % chartColors.length]} />
                                ))}
                              </Bar>
                            </BarChart>
                          ) : (
                            <div className="flex items-center justify-center h-full">
                              Sem dados para exibir
                            </div>
                          )}
                        </ResponsiveContainer>
                      </div>
                      
                      <div className="space-y-6">
                        {professionalData.map((professional, index) => {
                          const professionalTotalRevenue = professionalData.reduce((sum, p) => sum + p.revenue, 0);
                          
                          return (
                            <div key={professional.name} className="space-y-2">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center">
                                  <div className="w-4 h-4 rounded-full" style={{backgroundColor: chartColors[index % chartColors.length]}}></div>
                                  <span className="ml-2">{professional.name}</span>
                                </div>
                                <div className="font-medium">
                                  {formatCurrency(professional.revenue)}
                                </div>
                              </div>
                              <div className="h-2 bg-muted rounded-full">
                                <div 
                                  className="h-full rounded-full" 
                                  style={{
                                    backgroundColor: chartColors[index % chartColors.length],
                                    width: `${professionalTotalRevenue > 0 ? (professional.revenue / professionalTotalRevenue * 100) : 0}%`
                                  }}
                                ></div>
                              </div>
                              <div className="flex justify-between text-xs text-muted-foreground">
                                <span>{professional.clients} clientes</span>
                                <span>
                                  {professionalTotalRevenue > 0 
                                    ? Math.round(professional.revenue / professionalTotalRevenue * 100) 
                                    : 0}%
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="h-40 flex items-center justify-center text-muted-foreground">
                      Nenhum dado encontrado para o período selecionado
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="services">
              <Card>
                <CardHeader>
                  <CardTitle>Faturamento por Tipo de Serviço</CardTitle>
                  <CardDescription>Analise quais serviços são mais populares e lucrativos</CardDescription>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="h-80 bg-muted/30 rounded-md flex items-center justify-center">
                      Carregando dados...
                    </div>
                  ) : serviceData.length > 0 ? (
                    <div className="space-y-8">
                      <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={serviceData.map((service, index) => ({
                                name: service.name,
                                value: service.revenue
                              }))}
                              dataKey="value"
                              nameKey="name"
                              cx="50%"
                              cy="50%"
                              outerRadius={100}
                              fill="#8884d8"
                              label={({name, percent}) => `${name}: ${(percent * 100).toFixed(1)}%`}
                            >
                              {serviceData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={chartColors[index % chartColors.length]} />
                              ))}
                            </Pie>
                            <Tooltip formatter={(value) => formatCurrency(value as number)} />
                            <Legend />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      
                      <div className="space-y-6">
                        {serviceData.map((service, index) => {
                          const serviceTotalRevenue = serviceData.reduce((sum, s) => sum + s.revenue, 0);
                          
                          return (
                            <div key={service.name} className="space-y-2">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center">
                                  <div className="w-4 h-4 rounded-full" style={{backgroundColor: chartColors[index % chartColors.length]}}></div>
                                  <span className="ml-2">{service.name}</span>
                                </div>
                                <div className="font-medium">
                                  {formatCurrency(service.revenue)}
                                </div>
                              </div>
                              <div className="h-2 bg-muted rounded-full">
                                <div 
                                  className="h-full rounded-full" 
                                  style={{
                                    backgroundColor: chartColors[index % chartColors.length],
                                    width: `${serviceTotalRevenue > 0 ? (service.revenue / serviceTotalRevenue * 100) : 0}%`
                                  }}
                                ></div>
                              </div>
                              <div className="flex justify-between text-xs text-muted-foreground">
                                <span>{service.clients} clientes</span>
                                <span>
                                  {serviceTotalRevenue > 0 
                                    ? Math.round(service.revenue / serviceTotalRevenue * 100) 
                                    : 0}%
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="h-40 flex items-center justify-center text-muted-foreground">
                      Nenhum dado encontrado para o período selecionado
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </AppLayout>;
}
