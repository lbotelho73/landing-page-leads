import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar as CalendarIcon, Search } from "lucide-react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import ptBR from "@/lib/i18n";
import { format } from "date-fns";
import { ptBR as dateFnsPtBR } from "date-fns/locale";
import { formatCurrency } from "@/lib/format";
import { appointmentStatusMap } from "@/components/appointments/AppointmentStatusBadge";
import { AppointmentForm } from "@/components/appointments/AppointmentForm";
import { AppointmentStatusSelect } from "@/components/appointments/AppointmentStatusSelect";
import { DatePickerWithRange } from "@/components/ui/date-range-picker";
import { BulkDeleteButton } from "@/components/data/BulkDeleteButton";

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<any>(null);
  const [filteredAppointments, setFilteredAppointments] = useState<any[]>([]);
  const [dateRange, setDateRange] = useState<{
    from: Date;
    to?: Date;
  }>({
    from: new Date(),
    to: undefined,
  });
  const [statusFilter, setStatusFilter] = useState<string>("all");
  
  // Fetch appointments on component mount and when date range changes
  useEffect(() => {
    fetchAppointments();
  }, [dateRange]);
  
  // Apply filters when data changes
  useEffect(() => {
    applyFilters();
  }, [searchTerm, appointments, statusFilter]);
  
  const applyFilters = () => {
    let filtered = [...appointments];
    
    // Apply status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((appointment) => {
        if (statusFilter === "completed") return appointment.is_completed;
        if (statusFilter === "canceled") return appointment.cancellation_reason;
        // Default is scheduled (not completed, not canceled)
        return !appointment.is_completed && !appointment.cancellation_reason;
      });
    }
    
    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter((appointment) =>
        appointment.customer?.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        appointment.customer?.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        appointment.service?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        appointment.professionals?.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        appointment.professionals?.last_name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    setFilteredAppointments(filtered);
  };
  
  const fetchAppointments = async () => {
    try {
      setIsLoading(true);
      
      // Format the date range for Supabase query
      const fromDate = format(dateRange.from, "yyyy-MM-dd");
      const toDate = dateRange.to ? format(dateRange.to, "yyyy-MM-dd") : fromDate;
      
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          *,
          customer:customer_id(*),
          service:service_id(*),
          professionals:primary_professional_id(*),
          payment_method:payment_method_id(*)
        `)
        .gte('date', fromDate)
        .lte('date', toDate)
        .order('date')
        .order('time');
      
      if (error) throw error;
      
      // Fix the date to display correctly in the UI
      const appointmentsWithFixedDates = data?.map(appointment => {
        const dateObj = new Date(appointment.date);
        dateObj.setDate(dateObj.getDate() + 1); // Add one day to fix date display
        return {
          ...appointment,
          displayDate: dateObj
        };
      }) || [];
      
      console.log("Fetched appointments:", appointmentsWithFixedDates);
      setAppointments(appointmentsWithFixedDates);
    } catch (error: any) {
      console.error("Error fetching appointments:", error);
      toast.error(`Erro ao carregar agendamentos: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleEditClick = (appointment: any) => {
    setSelectedAppointment(appointment);
    setShowForm(true);
  };
  
  const handleFormClose = () => {
    setShowForm(false);
    setSelectedAppointment(null);
  };
  
  const handleFormSubmit = () => {
    fetchAppointments();
    handleFormClose();
  };
  
  return (
    <AppLayout>
      <div className="page-container">
        <div className="flex flex-wrap gap-4 justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">{ptBR.appointments}</h1>
          
          <div className="flex flex-wrap gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Buscar agendamentos..."
                className="w-full pl-8 md:w-[250px]"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <Button onClick={() => setShowForm(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Novo Agendamento
            </Button>

            {/* Botão de exclusão em massa */}
            <BulkDeleteButton 
              tableType="appointments"
              buttonText="Excluir Selecionados"
              onDeleteComplete={fetchAppointments}
              items={filteredAppointments}
              displayFields={["customer.first_name", "service.name", "date"]}
              displayLabels={["Cliente", "Serviço", "Data"]}
            />
          </div>
        </div>
        
        <div className="flex flex-wrap gap-4 mb-6">
          <AppointmentStatusSelect 
            value={statusFilter} 
            onValueChange={setStatusFilter}
            includeAll
          />
          
          <DatePickerWithRange
            value={dateRange}
            onChange={setDateRange}
          />
        </div>
        
        {showForm && (
          <AppointmentForm
            appointment={selectedAppointment}
            onClose={handleFormClose}
            onSubmit={handleFormSubmit}
          />
        )}
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Agendamentos</CardTitle>
            <CardDescription>
              Gerencie os agendamentos do seu negócio.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center h-64">
                <p>Carregando agendamentos...</p>
              </div>
            ) : filteredAppointments.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Nenhum agendamento encontrado.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="whitespace-nowrap">Data e Hora</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Serviço</TableHead>
                      <TableHead>Profissional</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAppointments.map((appointment) => {
                      const status = appointment.cancellation_reason
                        ? "canceled"
                        : appointment.is_completed
                        ? "completed"
                        : "scheduled";
                        
                      return (
                        <TableRow key={appointment.id}>
                          <TableCell className="whitespace-nowrap">
                            <div className="flex items-start gap-2">
                              <CalendarIcon className="h-4 w-4 mt-0.5" />
                              <div>
                                <div>
                                  {format(new Date(appointment.displayDate), "dd/MM/yyyy", {
                                    locale: dateFnsPtBR,
                                  })}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  {appointment.time.substring(0, 5)}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            {appointment.customer ? `${appointment.customer.first_name} ${appointment.customer.last_name}` : "-"}
                          </TableCell>
                          <TableCell>{appointment.service?.name || "-"}</TableCell>
                          <TableCell>
                            {appointment.professionals ? `${appointment.professionals.first_name} ${appointment.professionals.last_name}` : "-"}
                          </TableCell>
                          <TableCell>
                            <Badge variant={appointmentStatusMap[status].variant}>
                              {appointmentStatusMap[status].label}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(appointment.final_price)}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => handleEditClick(appointment)}
                            >
                              Editar
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
