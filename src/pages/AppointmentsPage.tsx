import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { format, parseISO, addHours } from "date-fns";
import { pt } from "date-fns/locale";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { formatCurrency, formatDate, formatDuration } from "@/lib/format";
import { supabase } from "@/lib/supabase";
import { Pencil, Trash2 } from "lucide-react";
import ptBR from "@/lib/i18n";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { logError } from "@/lib/database-helpers";

interface Appointment {
  id: string;
  date: Date;
  clientName: string;
  clientId: string;
  serviceType: string;
  serviceId: string;
  professional: string;
  professionalId: string;
  secondProfessional?: string;
  secondProfessionalId?: string;
  duration: number;
  basePrice: number;
  customPrice?: number | null;
  commissionRate: number;
  paymentMethod: string;
  paymentMethodId: string;
  paymentFee: number;
  hasDiscount: boolean;
  discountRate: number;
  finalPrice: number;
  clinicRevenue: number;
  professionalRevenue: number;
  secondProfessionalRevenue?: number;
  professionalPaymentStatus: "Paid" | "To be paid";
  professionalPaymentDate?: Date;
  notes: string;
}

// Função auxiliar para ajustar o fuso horário ao salvar para o Supabase
const adjustDateForStorage = (date: Date | undefined): string | null => {
  if (!date) return null;
  
  // Cria uma cópia da data para não modificar a original
  const adjustedDate = new Date(date);
  
  // Ajusta para o meio-dia para evitar problemas de fuso horário
  adjustedDate.setHours(12, 0, 0, 0);
  
  return adjustedDate.toISOString();
};

// Função auxiliar para ajustar o fuso horário ao exibir do Supabase
const adjustDateFromStorage = (dateString: string): Date => {
  // Converte a string para objeto Date
  const date = new Date(dateString);
  
  // Ajusta para o meio-dia para garantir que a data seja exibida corretamente
  date.setHours(12, 0, 0, 0);
  
  return date;
};

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [clients, setClients] = useState<{ id: string; name: string }[]>([]);
  const [services, setServices] = useState<{ id: string; name: string; price: number; duration: number; isFourHands: boolean }[]>([]);
  const [professionals, setProfessionals] = useState<{ id: string; name: string; commission: number }[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<{ id: string; name: string; fee: number }[]>([]);
  
  // States for form
  const [open, setOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentAppointmentId, setCurrentAppointmentId] = useState("");
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [clientId, setClientId] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [professionalId, setProfessionalId] = useState("");
  const [secondProfessionalId, setSecondProfessionalId] = useState("");
  const [paymentMethodId, setPaymentMethodId] = useState("");
  const [hasDiscount, setHasDiscount] = useState(false);
  const [discountRate, setDiscountRate] = useState("");
  const [useCustomPrice, setUseCustomPrice] = useState(false);
  const [customPrice, setCustomPrice] = useState("");
  const [notes, setNotes] = useState("");
  const [paymentStatus, setPaymentStatus] = useState<"Paid" | "To be paid">("To be paid");
  const [paymentDate, setPaymentDate] = useState<Date | undefined>();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [appointmentToDelete, setAppointmentToDelete] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch data from Supabase
  useEffect(() => {
    async function fetchData() {
      try {
        setIsLoading(true);
        console.log("Fetching data for appointments page...");
        
        // Fetch customers
        const { data: customersData, error: customersError } = await supabase
          .from('customers')
          .select('id, first_name, last_name');
        
        if (customersError) {
          console.error("Error fetching customers:", customersError);
          throw customersError;
        }
        
        // Fetch services
        const { data: servicesData, error: servicesError } = await supabase
          .from('services')
          .select('id, name, price, duration, requires_two_professionals');
        
        if (servicesError) {
          console.error("Error fetching services:", servicesError);
          throw servicesError;
        }
        
        // Fetch professionals
        const { data: professionalsData, error: professionalsError } = await supabase
          .from('professionals')
          .select('id, first_name, last_name, alias_name, commission_percentage');
        
        if (professionalsError) {
          console.error("Error fetching professionals:", professionalsError);
          throw professionalsError;
        }
        
        // Fetch payment methods
        const { data: paymentMethodsData, error: paymentMethodsError } = await supabase
          .from('payment_methods')
          .select('id, name, additional_fee_percentage');
        
        if (paymentMethodsError) {
          console.error("Error fetching payment methods:", paymentMethodsError);
          throw paymentMethodsError;
        }
        
        console.log("Data fetched successfully, now fetching appointments...");
        
        // Fetch appointments with related data
        const { data: appointmentsData, error: appointmentsError } = await supabase
          .from('appointments')
          .select(`
            *,
            customer:customer_id(id, first_name, last_name),
            service:service_id(id, name, price, duration),
            primary_professional:primary_professional_id(id, first_name, last_name, alias_name, commission_percentage),
            secondary_professional:secondary_professional_id(id, first_name, last_name, alias_name),
            payment_method:payment_method_id(id, name, additional_fee_percentage)
          `);
        
        if (appointmentsError) {
          console.error("Error fetching appointments:", appointmentsError);
          throw appointmentsError;
        }
        
        console.log("Appointments data:", appointmentsData);
        
        // Transform customers data
        const transformedClients = customersData.map(customer => ({
          id: customer.id,
          name: `${customer.first_name} ${customer.last_name}`
        }));
        
        // Transform services data
        const transformedServices = servicesData.map(service => ({
          id: service.id,
          name: service.name,
          price: service.price,
          duration: service.duration,
          isFourHands: service.requires_two_professionals || false
        }));
        
        // Transform professionals data
        const transformedProfessionals = professionalsData.map(professional => ({
          id: professional.id,
          name: professional.alias_name || `${professional.first_name} ${professional.last_name}`,
          commission: professional.commission_percentage
        }));
        
        // Transform payment methods data
        const transformedPaymentMethods = paymentMethodsData.map(method => ({
          id: method.id,
          name: method.name,
          fee: method.additional_fee_percentage || 0
        }));
        
        // Transform appointments data
        const transformedAppointments = appointmentsData
          .filter(appointment => appointment.customer && appointment.service && appointment.primary_professional)
          .map(appointment => {
            const client = appointment.customer;
            const service = appointment.service;
            const professional = appointment.primary_professional;
            const secondProfessional = appointment.secondary_professional;
            const paymentMethod = appointment.payment_method;
            
            // Calculate revenues
            const basePrice = appointment.service_price || service.price;
            const finalPrice = appointment.final_price;
            const professionalRevenue = basePrice * (professional.commission_percentage / 100);
            const clinicRevenue = finalPrice - professionalRevenue;
            
            return {
              id: appointment.id,
              // Ajuste de fuso horário ao carregar a data do banco
              date: adjustDateFromStorage(appointment.date),
              clientName: `${client.first_name} ${client.last_name}`,
              clientId: client.id,
              serviceType: service.name,
              serviceId: service.id,
              professional: professional.alias_name || `${professional.first_name} ${professional.last_name}`,
              professionalId: professional.id,
              secondProfessional: secondProfessional ? (secondProfessional.alias_name || `${secondProfessional.first_name} ${secondProfessional.last_name}`) : undefined,
              secondProfessionalId: appointment.secondary_professional_id || undefined,
              duration: service.duration,
              basePrice: service.price,
              customPrice: appointment.service_price !== service.price ? appointment.service_price : null,
              commissionRate: professional.commission_percentage,
              paymentMethod: paymentMethod ? paymentMethod.name : "",
              paymentMethodId: appointment.payment_method_id || "",
              paymentFee: paymentMethod ? paymentMethod.additional_fee_percentage || 0 : 0,
              hasDiscount: appointment.has_discount || false,
              discountRate: appointment.discount_percentage || 0,
              finalPrice: appointment.final_price,
              clinicRevenue: clinicRevenue,
              professionalRevenue: professionalRevenue,
              professionalPaymentStatus: appointment.professional_payment_status || "To be paid",
              // Ajuste de fuso horário para a data de pagamento também
              professionalPaymentDate: appointment.professional_payment_date ? adjustDateFromStorage(appointment.professional_payment_date) : undefined,
              notes: appointment.notes || ""
            };
          });
        
        console.log("Data transformed successfully");
        console.log("Clients:", transformedClients);
        console.log("Services:", transformedServices);
        console.log("Professionals:", transformedProfessionals);
        console.log("Payment Methods:", transformedPaymentMethods);
        console.log("Appointments:", transformedAppointments);
        
        // Set state
        setClients(transformedClients);
        setServices(transformedServices);
        setProfessionals(transformedProfessionals);
        setPaymentMethods(transformedPaymentMethods);
        setAppointments(transformedAppointments);
      } catch (error) {
        console.error("Error fetching data:", error);
        logError("Carregamento de dados de atendimentos", error);
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchData();
  }, []);

  // Get selected service
  const selectedService = services.find(service => service.id === serviceId);
  const isFourHands = selectedService?.isFourHands || false;
  
  // Get selected payment method
  const selectedPaymentMethod = paymentMethods.find(method => method.id === paymentMethodId);

  // Calculate final price
  const calculateFinalPrice = () => {
    if (!selectedService) return 0;
    
    // Base price is either the custom price (if enabled) or the service's standard price
    const basePrice = useCustomPrice && customPrice ? Number(customPrice) : selectedService.price;
    
    const paymentFee = selectedPaymentMethod ? selectedPaymentMethod.fee / 100 * basePrice : 0;
    const discountAmount = hasDiscount ? Number(discountRate) / 100 * basePrice : 0;
    
    return basePrice + paymentFee - discountAmount;
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (!date || !clientId || !serviceId || !professionalId || !paymentMethodId) {
        toast.error(ptBR.fillRequiredFields);
        return;
      }
      
      if (isFourHands && !secondProfessionalId) {
        toast.error("Segunda profissional é necessária para massagem a quatro mãos");
        return;
      }
      
      const selectedClient = clients.find(client => client.id === clientId);
      const selectedProfessional = professionals.find(prof => prof.id === professionalId);
      
      if (!selectedClient || !selectedService || !selectedProfessional || !selectedPaymentMethod) {
        toast.error("Seleção inválida");
        return;
      }
      
      const finalPrice = calculateFinalPrice();
      const basePrice = useCustomPrice && customPrice ? Number(customPrice) : selectedService.price;
      
      // Prepare data for Supabase
      const appointmentData = {
        // Ajuste a data para armazenamento no Supabase
        date: adjustDateForStorage(date),
        time: "12:00:00", // Default time if not specified
        customer_id: clientId,
        service_id: serviceId,
        primary_professional_id: professionalId,
        secondary_professional_id: isFourHands ? secondProfessionalId : null,
        service_duration: selectedService.duration,
        service_price: useCustomPrice && customPrice ? Number(customPrice) : selectedService.price,
        payment_method_id: paymentMethodId,
        has_discount: hasDiscount,
        discount_percentage: hasDiscount ? Number(discountRate) : 0,
        final_price: finalPrice,
        professional_payment_status: paymentStatus,
        // Ajuste a data de pagamento para armazenamento no Supabase
        professional_payment_date: paymentStatus === "Paid" ? adjustDateForStorage(paymentDate) : null,
        notes
      };
      
      console.log("Submitting appointment data:", appointmentData);
      
      let result;
      
      if (editMode) {
        // Update existing appointment
        result = await supabase
          .from('appointments')
          .update(appointmentData)
          .eq('id', currentAppointmentId);
      } else {
        // Insert new appointment
        result = await supabase
          .from('appointments')
          .insert(appointmentData);
      }
      
      if (result.error) {
        console.error("Error saving appointment:", result.error);
        throw result.error;
      }
      
      toast.success(editMode ? "Atendimento atualizado com sucesso!" : "Atendimento cadastrado com sucesso!");
      setOpen(false);
      resetForm();
      
      // Refresh appointments
      window.location.reload();
    } catch (error) {
      console.error("Error saving appointment:", error);
      logError("Salvar atendimento", error);
    }
  };
  
  const handleEdit = (appointmentId: string) => {
    const appointment = appointments.find(a => a.id === appointmentId);
    if (!appointment) return;
    
    setCurrentAppointmentId(appointmentId);
    setDate(appointment.date);
    setClientId(appointment.clientId);
    setServiceId(appointment.serviceId);
    setProfessionalId(appointment.professionalId);
    setSecondProfessionalId(appointment.secondProfessionalId || "");
    setPaymentMethodId(appointment.paymentMethodId);
    setHasDiscount(appointment.hasDiscount);
    setDiscountRate(appointment.discountRate.toString());
    setUseCustomPrice(!!appointment.customPrice);
    setCustomPrice(appointment.customPrice?.toString() || "");
    setNotes(appointment.notes);
    setPaymentStatus(appointment.professionalPaymentStatus);
    setPaymentDate(appointment.professionalPaymentDate);
    setEditMode(true);
    setOpen(true);
  };
  
  const handleDelete = async (appointmentId: string) => {
    try {
      const { error } = await supabase
        .from('appointments')
        .delete()
        .eq('id', appointmentId);
      
      if (error) throw error;
      
      toast.success("Atendimento excluído com sucesso!");
      // Refresh appointments
      window.location.reload();
    } catch (error) {
      console.error("Error deleting appointment:", error);
      logError("Excluir atendimento", error);
    } finally {
      setDeleteDialogOpen(false);
      setAppointmentToDelete(null);
    }
  };
  
  const confirmDelete = (appointmentId: string) => {
    setAppointmentToDelete(appointmentId);
    setDeleteDialogOpen(true);
  };
  
  const resetForm = () => {
    setCurrentAppointmentId("");
    setDate(new Date());
    setClientId("");
    setServiceId("");
    setProfessionalId("");
    setSecondProfessionalId("");
    setPaymentMethodId("");
    setHasDiscount(false);
    setDiscountRate("");
    setUseCustomPrice(false);
    setCustomPrice("");
    setNotes("");
    setPaymentStatus("To be paid");
    setPaymentDate(undefined);
    setEditMode(false);
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      resetForm();
    }
    setOpen(open);
  };
  
  return <AppLayout>
      <div className="page-container">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Atendimentos Realizados</h1>
          <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
              <Button className="bg-massage-500 hover:bg-massage-600">Cadastrar Atendimento</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <form onSubmit={handleSubmit}>
                <DialogHeader>
                  <DialogTitle>{editMode ? "Editar Atendimento" : "Cadastrar Novo Atendimento"}</DialogTitle>
                  <DialogDescription>Registre os detalhes do serviço, pagamento e informaçoes da(o) massagista que atendeu</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="date">Data</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !date && "text-muted-foreground")}>
                          <svg xmlns="http://www.w3.org/2000/svg" className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
                            <line x1="16" x2="16" y1="2" y2="6" />
                            <line x1="8" x2="8" y1="2" y2="6" />
                            <line x1="3" x2="21" y1="10" y2="10" />
                          </svg>
                          {date ? format(date, "PPP", { locale: pt }) : <span>Selecione uma data</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={date} onSelect={setDate} initialFocus locale={pt} />
                      </PopoverContent>
                    </Popover>
                  </div>
                  
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="client">Cliente</Label>
                      <Select value={clientId} onValueChange={setClientId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecionar cliente" />
                        </SelectTrigger>
                        <SelectContent>
                          {clients.map(client => <SelectItem key={client.id} value={client.id}>{client.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="grid gap-2">
                      <Label htmlFor="service">Tipo de Massagem</Label>
                      <Select value={serviceId} onValueChange={setServiceId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecionar serviço" />
                        </SelectTrigger>
                        <SelectContent>
                          {services.map(service => <SelectItem key={service.id} value={service.id}>{service.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="professional">Profissional</Label>
                      <Select value={professionalId} onValueChange={setProfessionalId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecionar profissional" />
                        </SelectTrigger>
                        <SelectContent>
                          {professionals.map(prof => <SelectItem key={prof.id} value={prof.id}>{prof.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {isFourHands && <div className="grid gap-2">
                        <Label htmlFor="secondProfessional">Segunda Profissional</Label>
                        <Select value={secondProfessionalId} onValueChange={setSecondProfessionalId}>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecionar segunda profissional" />
                          </SelectTrigger>
                          <SelectContent>
                            {professionals.filter(prof => prof.id !== professionalId).map(prof => <SelectItem key={prof.id} value={prof.id}>{prof.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>}
                  </div>
                  
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="paymentMethod">Forma de Pagamento</Label>
                      <Select value={paymentMethodId} onValueChange={setPaymentMethodId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecionar forma de pagamento" />
                        </SelectTrigger>
                        <SelectContent>
                          {paymentMethods.map(method => <SelectItem key={method.id} value={method.id}>
                              {method.name} {method.fee > 0 ? `(+${method.fee}%)` : ''}
                            </SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="flex flex-col gap-2 justify-end">
                      <div className="flex items-center space-x-2 h-10">
                        <Switch id="useCustomPrice" checked={useCustomPrice} onCheckedChange={setUseCustomPrice} />
                        <Label htmlFor="useCustomPrice">Alterar Valor</Label>
                      </div>
                      
                      {useCustomPrice && <div className="grid gap-2">
                          <Label htmlFor="customPrice">Valor Personalizado</Label>
                          <Input id="customPrice" type="number" min="0" step="0.01" value={customPrice} onChange={e => setCustomPrice(e.target.value)} />
                        </div>}
                    </div>
                  </div>
                  
                  <div className="flex flex-col gap-2 justify-end">
                    <div className="flex items-center space-x-2 h-10">
                      <Switch id="hasDiscount" checked={hasDiscount} onCheckedChange={setHasDiscount} />
                      <Label htmlFor="hasDiscount">Aplicar Desconto</Label>
                    </div>
                    
                    {hasDiscount && <div className="grid gap-2">
                        <Label htmlFor="discountRate">Percentual de Desconto (%)</Label>
                        <Input id="discountRate" type="number" min="0" max="100" value={discountRate} onChange={e => setDiscountRate(e.target.value)} />
                      </div>}
                  </div>
                  
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label>Status de pagamento da(o) Profissional</Label>
                      <Select value={paymentStatus} onValueChange={value => setPaymentStatus(value as "Paid" | "To be paid")}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="To be paid">A pagar</SelectItem>
                          <SelectItem value="Paid">Pago</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {paymentStatus === "Paid" && <div className="grid gap-2">
                        <Label htmlFor="paymentDate">Data do Pagamento</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !paymentDate && "text-muted-foreground")}>
                              <svg xmlns="http://www.w3.org/2000/svg" className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
                                <line x1="16" x2="16" y1="2" y2="6" />
                                <line x1="8" x2="8" y1="2" y2="6" />
                                <line x1="3" x2="21" y1="10" y2="10" />
                              </svg>
                              {paymentDate ? format(paymentDate, "PPP", { locale: pt }) : <span>Selecione uma data</span>}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar mode="single" selected={paymentDate} onSelect={setPaymentDate} initialFocus locale={pt} />
                          </PopoverContent>
                        </Popover>
                      </div>}
                  </div>
                  
                  <div className="grid gap-2">
                    <Label htmlFor="notes">Observações</Label>
                    <Textarea id="notes" value={notes} onChange={e => setNotes(e.target.value)} rows={3} />
                  </div>
                  
                  {serviceId && paymentMethodId && <div className="bg-muted p-4 rounded-md">
                      <h4 className="text-sm font-medium mb-2">Resumo do Preço</h4>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span>Preço base:</span>
                          <span>{formatCurrency(useCustomPrice && customPrice ? Number(customPrice) : (selectedService?.price || 0))}</span>
                        </div>
                        {hasDiscount && discountRate && <div className="flex justify-between text-red-500">
                            <span>Desconto ({discountRate}%):</span>
                            <span>-{formatCurrency(Number(discountRate) / 100 * (useCustomPrice && customPrice ? Number(customPrice) : (selectedService?.price || 0)))}</span>
                          </div>}
                        <div className="flex justify-between">
                          <span>Taxa de pagamento:</span>
                          <span>{formatCurrency((selectedPaymentMethod?.fee || 0) / 100 * (useCustomPrice && customPrice ? Number(customPrice) : (selectedService?.price || 0)))}</span>
                        </div>
                        <div className="border-t mt-1 pt-1 flex justify-between font-medium">
                          <span>Preço final:</span>
                          <span>{formatCurrency(calculateFinalPrice())}</span>
                        </div>
                      </div>
                    </div>}
                </div>
                
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                  <Button type="submit" className="bg-massage-500 hover:bg-massage-600">
                    {editMode ? "Atualizar Atendimento" : "Salvar Atendimento"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Atendimentos Recentes</CardTitle>
            <CardDescription>Visualizar e gerenciar todos os serviços realizados na sua clínica</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center items-center h-32">
                <p>Carregando atendimentos...</p>
              </div>
            ) : appointments.length === 0 ? (
              <div className="flex justify-center items-center h-32">
                <p>Nenhum atendimento encontrado. Cadastre seu primeiro atendimento clicando no botão acima.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Serviço</TableHead>
                      <TableHead>Duração</TableHead>
                      <TableHead>Profissional(is)</TableHead>
                      <TableHead>Preço base</TableHead>
                      <TableHead>Preço final</TableHead>
                      <TableHead>Receita clínica</TableHead>
                      <TableHead>Comissão prof.</TableHead>
                      <TableHead>Status Pagto Prof.</TableHead>
                      <TableHead>Data Pagto Prof.</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {appointments.map(appointment => <TableRow key={appointment.id}>
                        <TableCell>{formatDate(appointment.date)}</TableCell>
                        <TableCell>{appointment.clientName}</TableCell>
                        <TableCell>{appointment.serviceType}</TableCell>
                        <TableCell>{formatDuration(appointment.duration)}</TableCell>
                        <TableCell>
                          {appointment.professional}
                          {appointment.secondProfessional && <div className="text-xs text-muted-foreground mt-1">{appointment.secondProfessional}</div>}
                        </TableCell>
                        <TableCell>{formatCurrency(appointment.customPrice || appointment.basePrice)}</TableCell>
                        <TableCell>{formatCurrency(appointment.finalPrice)}</TableCell>
                        <TableCell>{formatCurrency(appointment.clinicRevenue)}</TableCell>
                        <TableCell>{formatCurrency(appointment.professionalRevenue)}</TableCell>
                        <TableCell>
                          <span className={appointment.professionalPaymentStatus === "Paid" ? "text-green-600" : "text-amber-600"}>
                            {appointment.professionalPaymentStatus === "Paid" ? "Pago" : "A pagar"}
                          </span>
                        </TableCell>
                        <TableCell>
                          {appointment.professionalPaymentDate ? formatDate(appointment.professionalPaymentDate) : "-"}
                        </TableCell>
                        <TableCell className="text-right space-x-1">
                          <Button variant="ghost" size="sm" onClick={() => handleEdit(appointment.id)}>
                            <Pencil className="h-4 w-4 mr-1" />
                            Editar
                          </Button>
                          <Button variant="ghost" size="sm" className="text-red-500" onClick={() => confirmDelete(appointment.id)}>
                            <Trash2 className="h-4 w-4 mr-1" />
                            Excluir
                          </Button>
                        </TableCell>
                      </TableRow>)}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este atendimento? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-red-500 hover:bg-red-600" onClick={() => appointmentToDelete && handleDelete(appointmentToDelete)}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>;
}