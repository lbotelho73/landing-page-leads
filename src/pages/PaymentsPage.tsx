
import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format, startOfWeek, endOfWeek } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { formatCurrency, formatDate, formatDuration } from "@/lib/format";
import { supabase } from "@/integrations/supabase/client";
// Import this as i18nPtBR to avoid conflict with date-fns ptBR
import i18nPtBR from "@/lib/i18n";

interface Payment {
  id: string;
  date: Date;
  clientName: string;
  serviceType: string;
  duration: number;
  basePrice: number;
  commissionRate: number;
  commissionAmount: number;
  paymentStatus: "Paid" | "To be paid";
  paymentDate?: Date;
  professionalId?: string; // Add this to track which professional's payment this is
}

export default function PaymentsPage() {
  const [selectedProfessional, setSelectedProfessional] = useState<string>("all"); // Default to "all"
  const [dateRange, setDateRange] = useState<"day" | "week" | "month" | "year" | "all">("month");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [professionals, setProfessionals] = useState<{ id: string, name: string }[]>([]);
  const [payments, setPayments] = useState<Record<string, Payment[]>>({});
  const [allPayments, setAllPayments] = useState<Payment[]>([]); // New state for all payments
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        setError(null);
        
        // Use checkTableExists from our utility instead of manually checking
        const professionalTableExists = await supabase.from('professionals').select('id').limit(1);
        
        if (professionalTableExists.error) {
          console.error("Error checking professionals table:", professionalTableExists.error);
          setError("A tabela de profissionais ainda não foi criada ou não está acessível.");
          setLoading(false);
          return;
        }
        
        // Fetch professionals
        const { data: professionalsData, error: professionalsError } = await supabase
          .from('professionals')
          .select('*');
        
        if (professionalsError) {
          console.error("Error fetching professionals:", professionalsError);
          throw professionalsError;
        }
        
        if (!professionalsData || professionalsData.length === 0) {
          setError("Nenhum profissional cadastrado.");
          setLoading(false);
          return;
        }
        
        // Transform professionals data
        const transformedProfessionals = professionalsData
          .filter(p => p.is_active !== false) // Include if is_active is true or null
          .map(professional => ({
            id: professional.id,
            name: professional.alias_name || `${professional.first_name} ${professional.last_name}`,
          }));
        
        setProfessionals(transformedProfessionals);
        
        // Check if appointments table exists
        const appointmentsTableCheck = await supabase.from('appointments').select('id').limit(1);
        
        if (appointmentsTableCheck.error) {
          console.error("Error checking appointments table:", appointmentsTableCheck.error);
          // No appointments table yet, but we can still show the professionals
          setLoading(false);
          return;
        }
        
        // Fetch appointments for each professional and also store a combined list for "All Professionals"
        const professionalPayments: Record<string, Payment[]> = {};
        let allPaymentsCombined: Payment[] = [];
        
        for (const professional of professionalsData) {
          try {
            const { data: appointmentsData, error: appointmentsError } = await supabase
              .from('appointments')
              .select(`
                *,
                customers:customer_id (*),
                services:service_id (*)
              `)
              .eq('primary_professional_id', professional.id);
            
            if (appointmentsError) {
              console.error(`Error fetching appointments for professional ${professional.id}:`, appointmentsError);
              continue;
            }
            
            if (!appointmentsData || appointmentsData.length === 0) {
              professionalPayments[professional.id] = [];
              continue;
            }
            
            // Transform appointments to payments
            const professionalPaymentsList: Payment[] = appointmentsData
              .filter(appointment => appointment.customers && appointment.services)
              .map(appointment => {
                const servicePrice = appointment.service_price || 
                  (appointment.services ? appointment.services.price : 0);
                
                const commissionAmount = servicePrice * (professional.commission_percentage / 100);
                const clientName = appointment.customers ? 
                  `${appointment.customers.first_name} ${appointment.customers.last_name}` : 
                  "Cliente não encontrado";
                
                return {
                  id: appointment.id,
                  date: new Date(appointment.date),
                  clientName: clientName,
                  serviceType: appointment.services ? appointment.services.name : "Serviço não encontrado",
                  duration: appointment.service_duration || 
                    (appointment.services ? appointment.services.duration : 0),
                  basePrice: servicePrice,
                  commissionRate: professional.commission_percentage,
                  commissionAmount: commissionAmount,
                  paymentStatus: appointment.professional_payment_status === "Paid" ? "Paid" : "To be paid",
                  paymentDate: appointment.professional_payment_date ? 
                    new Date(appointment.professional_payment_date) : undefined,
                  professionalId: professional.id
                };
              });
            
            professionalPayments[professional.id] = professionalPaymentsList;
            // Add this professional's payments to the combined list
            allPaymentsCombined = [...allPaymentsCombined, ...professionalPaymentsList];
          } catch (err) {
            console.error(`Error processing appointments for professional ${professional.id}:`, err);
          }
        }
        
        setPayments(professionalPayments);
        setAllPayments(allPaymentsCombined); // Store all payments
      } catch (error) {
        console.error("Error fetching data:", error);
        setError("Erro ao carregar dados. Verifique se as tabelas necessárias foram criadas.");
      } finally {
        setLoading(false);
      }
    }
    
    fetchData();
  }, []);

  const getFilteredPayments = () => {
    if (selectedProfessional === "all") {
      // Return all payments combined
      if (dateRange === "all") return allPayments;
      if (!selectedDate) return allPayments;
      
      return allPayments.filter(payment => filterPaymentByDate(payment));
    } else if (!selectedProfessional) {
      return [];
    }
    
    const professionalPayments = payments[selectedProfessional] || [];
    if (dateRange === "all") return professionalPayments;
    if (!selectedDate) return professionalPayments;
    
    return professionalPayments.filter(payment => filterPaymentByDate(payment));
  };
  
  // Helper function to filter payments by date
  const filterPaymentByDate = (payment: Payment) => {
    if (!selectedDate) return true;
    const paymentDate = new Date(payment.date);
    
    if (dateRange === "day") {
      return paymentDate.getDate() === selectedDate.getDate() && 
             paymentDate.getMonth() === selectedDate.getMonth() && 
             paymentDate.getFullYear() === selectedDate.getFullYear();
    }
    
    if (dateRange === "week") {
      const weekStart = startOfWeek(selectedDate, { locale: ptBR });
      const weekEnd = endOfWeek(selectedDate, { locale: ptBR });
      return paymentDate >= weekStart && paymentDate <= weekEnd;
    }
    
    if (dateRange === "month") {
      return paymentDate.getMonth() === selectedDate.getMonth() && 
             paymentDate.getFullYear() === selectedDate.getFullYear();
    }
    
    if (dateRange === "year") {
      return paymentDate.getFullYear() === selectedDate.getFullYear();
    }
    
    return true;
  };
  
  const filteredPayments = getFilteredPayments();
  
  const calculateTotalDue = () => {
    return filteredPayments
      .filter(payment => payment.paymentStatus === "To be paid")
      .reduce((total, payment) => total + payment.commissionAmount, 0);
  };
  
  const handlePayAll = async () => {
    try {
      if (selectedProfessional === "all") {
        // If "All Professionals" is selected, mark all filtered payments as paid
        const paymentsByProfessional: Record<string, string[]> = {};
        
        filteredPayments
          .filter(payment => payment.paymentStatus === "To be paid" && payment.professionalId)
          .forEach(payment => {
            if (!payment.professionalId) return;
            
            if (!paymentsByProfessional[payment.professionalId]) {
              paymentsByProfessional[payment.professionalId] = [];
            }
            paymentsByProfessional[payment.professionalId].push(payment.id);
          });
        
        // Update payments for each professional
        for (const professionalId of Object.keys(paymentsByProfessional)) {
          const paymentIds = paymentsByProfessional[professionalId];
          await updatePaymentStatus(paymentIds);
        }
        
        toast.success("Todos os pagamentos filtrados foram marcados como pagos");
      } else if (!selectedProfessional) {
        return;
      } else {
        // Update payments for the selected professional
        const paymentIds = filteredPayments
          .filter(payment => payment.paymentStatus === "To be paid")
          .map(payment => payment.id);
        
        await updatePaymentStatus(paymentIds);
        
        const selectedProfessionalName = professionals.find(p => p.id === selectedProfessional)?.name;
        toast.success(`Todos os pagamentos para ${selectedProfessionalName} marcados como pagos`);
      }
      
      // Update the local state
      if (selectedProfessional === "all") {
        // Update all payments
        const updatedAllPayments = allPayments.map(payment => {
          if (filteredPayments.some(fp => fp.id === payment.id && fp.paymentStatus === "To be paid")) {
            return {
              ...payment,
              paymentStatus: "Paid" as const,
              paymentDate: new Date()
            };
          }
          return payment;
        });
        
        setAllPayments(updatedAllPayments);
        
        // Also update the individual professional payments
        const updatedPayments = { ...payments };
        
        Object.keys(updatedPayments).forEach(professionalId => {
          updatedPayments[professionalId] = updatedPayments[professionalId].map(payment => {
            if (filteredPayments.some(fp => fp.id === payment.id && fp.paymentStatus === "To be paid")) {
              return {
                ...payment,
                paymentStatus: "Paid" as const,
                paymentDate: new Date()
              };
            }
            return payment;
          });
        });
        
        setPayments(updatedPayments);
      } else {
        // Update just the selected professional's payments
        const updatedPayments = { ...payments };
        
        updatedPayments[selectedProfessional] = payments[selectedProfessional].map(payment => {
          if (filteredPayments.some(fp => fp.id === payment.id && fp.paymentStatus === "To be paid")) {
            return {
              ...payment,
              paymentStatus: "Paid" as const,
              paymentDate: new Date()
            };
          }
          return payment;
        });
        
        setPayments(updatedPayments);
        
        // Also update the all payments list
        const updatedAllPayments = allPayments.map(payment => {
          if (payment.professionalId === selectedProfessional && 
              filteredPayments.some(fp => fp.id === payment.id && fp.paymentStatus === "To be paid")) {
            return {
              ...payment,
              paymentStatus: "Paid" as const,
              paymentDate: new Date()
            };
          }
          return payment;
        });
        
        setAllPayments(updatedAllPayments);
      }
    } catch (error) {
      console.error("Error updating payment status:", error);
      toast.error("Erro ao atualizar status de pagamento");
    }
  };
  
  // Helper function to update payment status in the database
  const updatePaymentStatus = async (paymentIds: string[]) => {
    if (paymentIds.length === 0) {
      toast.info("Não há pagamentos pendentes para marcar como pagos");
      return;
    }
    
    // Check if we have an appointments table before trying to update
    const { data: appointmentsTableExists } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_name', 'appointments')
      .single();
    
    if (!appointmentsTableExists) {
      toast.error("Tabela de agendamentos não encontrada");
      return;
    }
    
    // Check column names before updating
    const { data: columns } = await supabase
      .from('information_schema.columns')
      .select('column_name')
      .eq('table_schema', 'public')
      .eq('table_name', 'appointments');
    
    const columnNames = columns?.map(col => col.column_name) || [];
    const hasPaymentStatusCol = columnNames.includes('professional_payment_status');
    const hasPaymentDateCol = columnNames.includes('professional_payment_date');
    
    if (!hasPaymentStatusCol || !hasPaymentDateCol) {
      toast.error("Colunas de status de pagamento não encontradas na tabela");
      return;
    }
    
    const { error } = await supabase
      .from('appointments')
      .update({
        professional_payment_status: "Paid",
        professional_payment_date: new Date().toISOString()
      })
      .in('id', paymentIds);
    
    if (error) throw error;
  };
  
  const selectedProfessionalName = selectedProfessional === "all" 
    ? "Todos os Profissionais"
    : selectedProfessional
    ? professionals.find(p => p.id === selectedProfessional)?.name
    : '';
  
  return (
    <AppLayout>
      <div className="page-container">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">Pagamento de Profissionais</h1>
        </div>
        
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Filtros</CardTitle>
            <CardDescription>Selecione um(a) profissional e um intervalo de datas para ver os status de pagamentos</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 md:grid-cols-3">
              <div className="space-y-2">
                <label className="text-sm font-medium">Selecionar um(a) Profissional</label>
                <Select value={selectedProfessional} onValueChange={setSelectedProfessional}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar profissional" />
                  </SelectTrigger>
                  <SelectContent>
                    {/* Add "All Professionals" option */}
                    <SelectItem value="all">Todos os Profissionais</SelectItem>
                    {professionals.map(professional => (
                      <SelectItem key={professional.id} value={professional.id}>
                        {professional.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Intervalo de Data</label>
                <Select value={dateRange} onValueChange={(value: "day" | "week" | "month" | "year" | "all") => setDateRange(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="day">Dia</SelectItem>
                    <SelectItem value="week">Semana</SelectItem>
                    <SelectItem value="month">Mês</SelectItem>
                    <SelectItem value="year">Ano</SelectItem>
                    <SelectItem value="all">Todo Período</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {dateRange !== "all" && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Selecionar Data</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !selectedDate && "text-muted-foreground")}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
                          <line x1="16" x2="16" y1="2" y2="6" />
                          <line x1="8" x2="8" y1="2" y2="6" />
                          <line x1="3" x2="21" y1="10" y2="10" />
                        </svg>
                        {selectedDate ? format(
                          selectedDate, 
                          dateRange === "day" 
                            ? "PPP" 
                            : dateRange === "week" 
                              ? "'Semana de' d 'de' MMMM" 
                              : dateRange === "month" 
                                ? "MMMM yyyy" 
                                : "yyyy", 
                          { locale: ptBR }
                        ) : <span>Selecionar data</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar 
                        mode="single" 
                        selected={selectedDate} 
                        onSelect={setDate => setDate && setSelectedDate(setDate)} 
                        initialFocus 
                        locale={ptBR}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
        
        {loading ? (
          <Card>
            <CardContent className="py-8">
              <div className="text-center text-muted-foreground">
                Carregando dados...
              </div>
            </CardContent>
          </Card>
        ) : error ? (
          <Card>
            <CardContent className="py-8">
              <div className="text-center text-destructive">
                {error}
              </div>
              <div className="text-center mt-4 text-muted-foreground">
                Verifique se as tabelas necessárias foram criadas no banco de dados.
              </div>
            </CardContent>
          </Card>
        ) : selectedProfessional ? (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Pagamentos de {selectedProfessionalName}</CardTitle>
                <CardDescription>
                  {dateRange === "day" && selectedDate && `Para ${format(selectedDate, "PPP", { locale: ptBR })}`}
                  {dateRange === "week" && selectedDate && `Para a semana de ${format(selectedDate, "d 'de' MMMM", { locale: ptBR })}`}
                  {dateRange === "month" && selectedDate && `Para ${format(selectedDate, "MMMM yyyy", { locale: ptBR })}`}
                  {dateRange === "year" && selectedDate && `Para ${format(selectedDate, "yyyy", { locale: ptBR })}`}
                  {dateRange === "all" && 'Todo período'}
                </CardDescription>
              </div>
              
              {calculateTotalDue() > 0 && (
                <Button onClick={handlePayAll} className="bg-massage-500 hover:bg-massage-600">
                  Pagar {formatCurrency(calculateTotalDue())}
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {filteredPayments.length > 0 ? (
                <>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Data</TableHead>
                          <TableHead>Cliente</TableHead>
                          <TableHead>Serviço</TableHead>
                          <TableHead>Duração</TableHead>
                          <TableHead>Preço</TableHead>
                          <TableHead>Comissão</TableHead>
                          <TableHead>Valor</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Data do Pagamento</TableHead>
                          {selectedProfessional === "all" && <TableHead>Profissional</TableHead>}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredPayments.map(payment => (
                          <TableRow key={payment.id}>
                            <TableCell>{formatDate(payment.date)}</TableCell>
                            <TableCell>{payment.clientName}</TableCell>
                            <TableCell>{payment.serviceType}</TableCell>
                            <TableCell>{formatDuration(payment.duration)}</TableCell>
                            <TableCell>{formatCurrency(payment.basePrice)}</TableCell>
                            <TableCell>{payment.commissionRate}%</TableCell>
                            <TableCell>{formatCurrency(payment.commissionAmount)}</TableCell>
                            <TableCell>
                              <span className={payment.paymentStatus === "Paid" ? "text-green-600" : "text-amber-600"}>
                                {payment.paymentStatus === "Paid" ? "Pago" : "A pagar"}
                              </span>
                            </TableCell>
                            <TableCell>
                              {payment.paymentDate ? formatDate(payment.paymentDate) : "-"}
                            </TableCell>
                            {selectedProfessional === "all" && (
                              <TableCell>
                                {payment.professionalId && 
                                  professionals.find(p => p.id === payment.professionalId)?.name}
                              </TableCell>
                            )}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  
                  <div className="mt-6 p-4 bg-muted rounded-md">
                    <div className="flex justify-between">
                      <span className="font-medium">Total a pagar:</span>
                      <span className="font-bold text-lg">{formatCurrency(calculateTotalDue())}</span>
                    </div>
                  </div>
                </> 
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhum pagamento encontrado para os filtros selecionados.
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="py-8">
              <div className="text-center text-muted-foreground">
                Selecione um profissional para ver os pagamentos
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
