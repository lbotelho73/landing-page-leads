import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { BarChart, LineChart, PieChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Line, Pie, Cell, ResponsiveContainer, Legend } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/format";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { DateRange } from "react-day-picker";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface ServiceData {
  name: string;
  appointments: number;
  revenue: number;
  averageDuration: number;
  percentage: number;
}

interface ProfessionalData {
  name: string;
  appointments: number;
  revenue: number;
  percentage: number;
}

interface MarketingChannelData {
  name: string;
  clients: number;
  revenue: number;
  percentage: number;
}

export default function ReportsPage() {
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [serviceData, setServiceData] = useState<ServiceData[]>([]);
  const [professionalData, setProfessionalData] = useState<ProfessionalData[]>([]);
  const [marketingChannelData, setMarketingChannelData] = useState<MarketingChannelData[]>([]);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, [dateRange]);
  
  const fetchData = async () => {
    setLoading(true);
    setError(null);

    try {
      // Fetch appointments within the date range
      let query = supabase
        .from('appointments')
        .select(`
          id,
          date,
          final_price,
          service_price,
          service_id,
          primary_professional_id,
          marketing_channel_id,
          customer_id,
          services(name, duration),
          professionals:primary_professional_id(first_name, last_name, alias_name),
          customers(id, referral_source)
        `);

      if (dateRange?.from) {
        const formattedFromDate = format(dateRange.from, 'yyyy-MM-dd');
        query = query.gte('date', formattedFromDate);
        console.log("Filtering from date:", formattedFromDate);
      }
      
      if (dateRange?.to) {
        const formattedToDate = format(dateRange.to, 'yyyy-MM-dd');
        query = query.lte('date', formattedToDate);
        console.log("Filtering to date:", formattedToDate);
      }

      // Execute query
      const { data: appointments, error: appointmentsError } = await query;

      if (appointmentsError) {
        console.error("Error fetching appointments:", appointmentsError);
        toast.error("Erro ao carregar os agendamentos.");
        setError("Erro ao carregar os agendamentos.");
        setLoading(false);
        return;
      }

      console.log("Fetched appointments:", appointments?.length || 0);
      if (appointments && appointments.length > 0) {
        console.log("Sample appointment:", appointments[0]);
      }

      if (!appointments || appointments.length === 0) {
        toast.info("Nenhum agendamento encontrado para o período selecionado.");
        setServiceData([]);
        setProfessionalData([]);
        setMarketingChannelData([]);
        setTotalRevenue(0);
        setLoading(false);
        return;
      }

      // Fetch all marketing channels to ensure we have all channel names
      const { data: allChannels, error: channelsError } = await supabase
        .from('marketing_channels')
        .select('id, name');

      if (channelsError) {
        console.error("Error fetching marketing channels:", channelsError);
      }
      
      // Process service data
      const servicesMap = new Map<string, { name: string; appointments: number; revenue: number; totalDuration: number }>();
      appointments.forEach(appointment => {
        if (appointment.services) {
          const serviceId = appointment.service_id || 'unknown';
          // Fix accessing properties by ensuring services is an object, not an array
          const serviceData = appointment.services as { name?: string; duration?: number };
          const serviceName = serviceData.name || 'Sem Nome';
          const serviceDuration = serviceData.duration || 0;
          const servicePrice = parseFloat(appointment.service_price) || 0;

          if (servicesMap.has(serviceId)) {
            const existingService = servicesMap.get(serviceId)!;
            servicesMap.set(serviceId, {
              name: serviceName,
              appointments: existingService.appointments + 1,
              revenue: existingService.revenue + servicePrice,
              totalDuration: existingService.totalDuration + serviceDuration,
            });
          } else {
            servicesMap.set(serviceId, {
              name: serviceName,
              appointments: 1,
              revenue: servicePrice,
              totalDuration: serviceDuration,
            });
          }
        }
      });

      const servicesArray: ServiceData[] = Array.from(servicesMap.entries()).map(([, value]) => ({
        name: value.name,
        appointments: value.appointments,
        revenue: value.revenue,
        averageDuration: value.appointments > 0 ? value.totalDuration / value.appointments : 0,
        percentage: 0, // Will be calculated later
      }));
      
      // Sort services by revenue
      servicesArray.sort((a, b) => b.revenue - a.revenue);

      // Process professional data
      const professionalsMap = new Map<string, { name: string; appointments: number; revenue: number }>();
      appointments.forEach(appointment => {
        if (appointment.professionals) {
          const professionalId = appointment.primary_professional_id || 'unknown';
          // Fix accessing properties by ensuring professionals is an object, not an array
          const professionalData = appointment.professionals as { alias_name?: string; first_name?: string; last_name?: string };
          const professionalName = professionalData.alias_name ||
            `${professionalData.first_name} ${professionalData.last_name}`;
          const servicePrice = parseFloat(appointment.service_price) || 0;

          if (professionalsMap.has(professionalId)) {
            const existingProfessional = professionalsMap.get(professionalId)!;
            professionalsMap.set(professionalId, {
              name: professionalName,
              appointments: existingProfessional.appointments + 1,
              revenue: existingProfessional.revenue + servicePrice,
            });
          } else {
            professionalsMap.set(professionalId, {
              name: professionalName,
              appointments: 1,
              revenue: servicePrice,
            });
          }
        }
      });

      const professionalsArray: ProfessionalData[] = Array.from(professionalsMap.entries())
        .map(([, value]) => ({
          name: value.name,
          appointments: value.appointments,
          revenue: value.revenue,
          percentage: 0, // Will be calculated later
        }));
      
      // Sort professionals by revenue
      professionalsArray.sort((a, b) => b.revenue - a.revenue);
      
      // Process marketing channel data
      const marketingChannelsMap = new Map<string, { name: string; clients: Set<string>; revenue: number }>();
      
      // Initialize with all marketing channels from the database
      if (allChannels) {
        allChannels.forEach(channel => {
          marketingChannelsMap.set(channel.id, {
            name: channel.name,
            clients: new Set<string>(),
            revenue: 0
          });
        });
      }
      
      // Add "Not specified" channel for appointments without marketing channel
      marketingChannelsMap.set('not_specified', {
        name: "Não especificado",
        clients: new Set<string>(),
        revenue: 0
      });
      
      // Process each appointment
      appointments.forEach(appointment => {
        const customerId = appointment.customer_id;
        const finalPrice = parseFloat(appointment.final_price) || 0;
        
        if (appointment.marketing_channel_id) {
          // Case 1: Appointment has a direct marketing channel ID
          const channelId = appointment.marketing_channel_id;
          
          if (marketingChannelsMap.has(channelId)) {
            const channel = marketingChannelsMap.get(channelId)!;
            channel.revenue += finalPrice;
            if (customerId) {
              channel.clients.add(customerId);
            }
          }
        } else if (appointment.customers && typeof appointment.customers === 'object' && 'referral_source' in appointment.customers) {
          // Case 2: Appointment has customer with referral_source
          const referralSource = (appointment.customers as any).referral_source;
          
          if (referralSource) {
            // Try to match with an existing channel by name
            let matchFound = false;
            
            for (const [channelId, channelData] of marketingChannelsMap.entries()) {
              if (channelData.name.toLowerCase() === referralSource.toLowerCase()) {
                channelData.revenue += finalPrice;
                if (customerId) {
                  channelData.clients.add(customerId);
                }
                matchFound = true;
                break;
              }
            }
            
            // If no match was found, add to "Not specified"
            if (!matchFound) {
              const notSpecified = marketingChannelsMap.get('not_specified')!;
              notSpecified.revenue += finalPrice;
              if (customerId) {
                notSpecified.clients.add(customerId);
              }
            }
          } else {
            // No referral source, add to "Not specified"
            const notSpecified = marketingChannelsMap.get('not_specified')!;
            notSpecified.revenue += finalPrice;
            if (customerId) {
              notSpecified.clients.add(customerId);
            }
          }
        } else {
          // Case 3: No marketing info, add to "Not specified"
          const notSpecified = marketingChannelsMap.get('not_specified')!;
          notSpecified.revenue += finalPrice;
          if (customerId) {
            notSpecified.clients.add(customerId);
          }
        }
      });
      
      // Convert marketing channels to array format and filter out empty ones
      const marketingChannelsArray: MarketingChannelData[] = Array.from(marketingChannelsMap.entries())
        .map(([, value]) => ({
          name: value.name,
          clients: value.clients.size,
          revenue: value.revenue,
          percentage: 0, // Will be calculated later
        }))
        .filter(channel => channel.revenue > 0 || channel.clients > 0);
      
      // Sort channels by revenue
      marketingChannelsArray.sort((a, b) => b.revenue - a.revenue);

      console.log("Marketing channels data:", marketingChannelsArray);

      // Calculate total revenue and percentages
      const calculatedTotalRevenue = appointments.reduce((sum, appointment) => sum + (parseFloat(appointment.final_price) || 0), 0);
      setTotalRevenue(calculatedTotalRevenue);

      const updatePercentages = (data: any[]) => {
        if (calculatedTotalRevenue === 0) return data.map(item => ({ ...item, percentage: 0 }));
        return data.map(item => ({
          ...item,
          percentage: (item.revenue / calculatedTotalRevenue) * 100,
        }));
      };

      setServiceData(updatePercentages(servicesArray));
      setProfessionalData(updatePercentages(professionalsArray));
      setMarketingChannelData(updatePercentages(marketingChannelsArray));

      console.log("Processed data:", {
        services: updatePercentages(servicesArray),
        professionals: updatePercentages(professionalsArray),
        marketingChannels: updatePercentages(marketingChannelsArray)
      });
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Erro ao carregar os dados.");
      setError("Erro ao carregar os dados.");
    } finally {
      setLoading(false);
    }
  };

  const chartColors = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#a63c91', '#0c548c', '#e63946', '#5e548e', '#00b4d8'];

  // Custom formatter for tooltips to handle both string and number values
  const currencyFormatter = (value: any) => {
    if (typeof value === 'number') {
      return formatCurrency(value);
    }
    return value ? String(value) : '';
  };

  return (
    <AppLayout>
      <div className="container mx-auto py-10">
        <Card>
          <CardHeader>
            <CardTitle>Relatórios</CardTitle>
            <CardDescription>Selecione o período para gerar os relatórios.</CardDescription>
          </CardHeader>
          <CardContent>
            <DateRangePicker
              value={dateRange}
              onChange={setDateRange}
              className="w-full"
            />
          </CardContent>
        </Card>

        {loading ? (
          <Card className="mt-6">
            <CardContent className="py-6">
              Carregando dados...
            </CardContent>
          </Card>
        ) : error ? (
          <Card className="mt-6">
            <CardContent>
              Erro: {error}
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Visão Geral</CardTitle>
                  <CardDescription>Receita total: {formatCurrency(totalRevenue)}</CardDescription>
                </CardHeader>
                <CardContent>
                  {totalRevenue > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart 
                        data={[{ name: 'Receita Total', value: totalRevenue }]}
                        margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
                      >
                        <CartesianGrid stroke="#ccc" strokeDasharray="5 5" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip formatter={currencyFormatter} />
                        <Bar dataKey="value" fill="#8884d8" name="Valor" />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                      Nenhum dado para o período selecionado
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Serviços Mais Agendados</CardTitle>
                  <CardDescription>Lista dos serviços mais agendados.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    {serviceData.length > 0 ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Serviço</TableHead>
                            <TableHead>Qtd. Agendamentos</TableHead>
                            <TableHead>Receita</TableHead>
                            <TableHead>Duração Média</TableHead>
                            <TableHead>% do Total</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {serviceData.map((service, index) => (
                            <TableRow key={index}>
                              <TableCell>{service.name}</TableCell>
                              <TableCell>{service.appointments}</TableCell>
                              <TableCell>{formatCurrency(service.revenue)}</TableCell>
                              <TableCell>{service.averageDuration.toFixed(0)} min</TableCell>
                              <TableCell>{service.percentage.toFixed(2)}%</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : (
                      <div className="h-40 flex items-center justify-center text-muted-foreground">
                        Nenhum dado para o período selecionado
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Profissionais com Mais Agendamentos</CardTitle>
                  <CardDescription>Lista dos profissionais com mais agendamentos.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    {professionalData.length > 0 ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Profissional</TableHead>
                            <TableHead>Qtd. Agendamentos</TableHead>
                            <TableHead>Receita Gerada</TableHead>
                            <TableHead>% do Total</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {professionalData.map((professional, index) => (
                            <TableRow key={index}>
                              <TableCell>{professional.name}</TableCell>
                              <TableCell>{professional.appointments}</TableCell>
                              <TableCell>{formatCurrency(professional.revenue)}</TableCell>
                              <TableCell>{professional.percentage.toFixed(2)}%</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : (
                      <div className="h-40 flex items-center justify-center text-muted-foreground">
                        Nenhum dado para o período selecionado
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Canais de Marketing Mais Eficazes</CardTitle>
                  <CardDescription>Lista dos canais de marketing mais eficazes.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Canal</TableHead>
                          <TableHead>Qtd. Clientes</TableHead>
                          <TableHead>Receita Gerada</TableHead>
                          <TableHead>% do Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {marketingChannelData.length > 0 ? (
                          marketingChannelData.map((channel, index) => (
                            <TableRow key={index}>
                              <TableCell>{channel.name}</TableCell>
                              <TableCell>{channel.clients}</TableCell>
                              <TableCell>{formatCurrency(channel.revenue)}</TableCell>
                              <TableCell>{channel.percentage.toFixed(2)}%</TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center py-4">
                              Nenhum dado de canal de marketing encontrado para o período selecionado
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Distribuição de Serviços</CardTitle>
                  <CardDescription>Distribuição dos serviços por receita.</CardDescription>
                </CardHeader>
                <CardContent>
                  {serviceData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          dataKey="revenue"
                          isAnimationActive={false}
                          data={serviceData}
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          fill="#8884d8"
                          label={({name, percent}) => `${name}: ${(percent * 100).toFixed(1)}%`}
                        >
                          {serviceData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={chartColors[index % chartColors.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={value => formatCurrency(value as number)} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                      Nenhum dado para mostrar
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Distribuição de Profissionais</CardTitle>
                  <CardDescription>Distribuição dos profissionais por receita.</CardDescription>
                </CardHeader>
                <CardContent>
                  {professionalData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          dataKey="revenue"
                          isAnimationActive={false}
                          data={professionalData}
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          fill="#8884d8"
                          label={({name, percent}) => `${name}: ${(percent * 100).toFixed(1)}%`}
                        >
                          {professionalData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={chartColors[index % chartColors.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={value => formatCurrency(value as number)} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                      Nenhum dado para mostrar
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Distribuição de Canais de Marketing</CardTitle>
                  <CardDescription>Distribuição dos canais de marketing por receita.</CardDescription>
                </CardHeader>
                <CardContent>
                  {marketingChannelData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          dataKey="revenue"
                          isAnimationActive={false}
                          data={marketingChannelData}
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          fill="#8884d8"
                          label={({name, percent}) => `${name}: ${(percent * 100).toFixed(1)}%`}
                        >
                          {marketingChannelData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={chartColors[index % chartColors.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={value => formatCurrency(value as number)} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                      Nenhum dado de canal de marketing para mostrar
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
}
