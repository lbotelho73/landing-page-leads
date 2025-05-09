import { useState, useEffect } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CustomerSearch } from "@/components/customers/CustomerSearch";
import { supabase } from "@/integrations/supabase/client";
import { formatTimeDisplay } from "@/lib/format";
import { formatDateForSupabase } from "@/integrations/supabase/client";

interface AppointmentFormProps {
  appointment?: any;
  onClose: () => void;
  onSubmit: () => void;
}

export function AppointmentForm({ 
  appointment, 
  onClose, 
  onSubmit 
}: AppointmentFormProps) {
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [time, setTime] = useState("");
  const [customer, setCustomer] = useState<any>(null);
  const [service, setService] = useState<any>(null);
  const [professional, setProfessional] = useState<any>(null);
  const [secondaryProfessional, setSecondaryProfessional] = useState<any>(null);
  const [paymentMethod, setPaymentMethod] = useState<any>(null);
  const [price, setPrice] = useState<number | undefined>(undefined);
  const [finalPrice, setFinalPrice] = useState<number | undefined>(undefined);
  const [duration, setDuration] = useState<number | undefined>(undefined);
  const [hasDiscount, setHasDiscount] = useState(false);
  const [discountPercentage, setDiscountPercentage] = useState<number | undefined>(0);
  const [notes, setNotes] = useState("");
  const [isCompleted, setIsCompleted] = useState(false);
  const [isCanceled, setIsCanceled] = useState(false);
  const [cancellationReason, setCancellationReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [services, setServices] = useState<any[]>([]);
  const [professionals, setProfessionals] = useState<any[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
  const [timeSlots, setTimeSlots] = useState<string[]>([]);
  const [tab, setTab] = useState("details");
  
  useEffect(() => {
    fetchServices();
    fetchProfessionals();
    fetchPaymentMethods();
    generateTimeSlots();
  }, []);
  
  // Initialize form with existing appointment data
  useEffect(() => {
    if (appointment) {
      // Corrigindo o problema da data:
      // Antes estávamos usando uma lógica que gerava datas incorretas
      // Agora vamos usar diretamente a data do agendamento sem adicionar um dia
      const appointmentDate = new Date(appointment.date);
      console.log("Appointment original date:", appointment.date);
      console.log("Appointment parsed date:", appointmentDate);
      
      setDate(appointmentDate);
      setTime(appointment.time?.substring(0, 5) || "");
      setService(appointment.service);
      setProfessional(appointment.professionals);
      setPaymentMethod(appointment.payment_method);
      setPrice(appointment.service_price);
      setFinalPrice(appointment.final_price);
      setDuration(appointment.service_duration);
      setHasDiscount(appointment.has_discount || false);
      setDiscountPercentage(appointment.discount_percentage || 0);
      setNotes(appointment.notes || "");
      setIsCompleted(appointment.is_completed || false);
      setIsCanceled(!!appointment.cancellation_reason);
      setCancellationReason(appointment.cancellation_reason || "");
      
      // Fetch customer if available
      if (appointment.customer_id) {
        fetchCustomer(appointment.customer_id);
      }
      
      // Fetch secondary professional if available
      if (appointment.secondary_professional_id) {
        fetchSecondaryProfessional(appointment.secondary_professional_id);
      }
    }
  }, [appointment]);
  
  // Update final price when price, discount status or percentage changes
  useEffect(() => {
    if (price !== undefined) {
      if (hasDiscount && discountPercentage) {
        const discount = price * (discountPercentage / 100);
        setFinalPrice(price - discount);
      } else {
        setFinalPrice(price);
      }
    }
  }, [price, hasDiscount, discountPercentage]);
  
  // Update price and duration when service changes
  useEffect(() => {
    if (service) {
      setPrice(service.price);
      setDuration(service.duration);
    }
  }, [service]);
  
  const fetchCustomer = async (customerId: string) => {
    try {
      const { data, error } = await supabase
        .from("customers")
        .select("*")
        .eq("id", customerId)
        .single();
      
      if (error) throw error;
      setCustomer(data);
    } catch (error) {
      console.error("Error fetching customer:", error);
    }
  };
  
  const fetchSecondaryProfessional = async (professionalId: string) => {
    try {
      const { data, error } = await supabase
        .from("professionals")
        .select("*")
        .eq("id", professionalId)
        .single();
      
      if (error) throw error;
      setSecondaryProfessional(data);
    } catch (error) {
      console.error("Error fetching secondary professional:", error);
    }
  };
  
  const fetchServices = async () => {
    try {
      const { data, error } = await supabase
        .from("services")
        .select("*")
        .eq("is_active", true)
        .order("name");
      
      if (error) throw error;
      setServices(data || []);
    } catch (error) {
      console.error("Error fetching services:", error);
      toast.error("Erro ao carregar serviços");
    }
  };
  
  const fetchProfessionals = async () => {
    try {
      const { data, error } = await supabase
        .from("professionals")
        .select("*")
        .eq("is_active", true)
        .order("first_name");
      
      if (error) throw error;
      setProfessionals(data || []);
    } catch (error) {
      console.error("Error fetching professionals:", error);
      toast.error("Erro ao carregar profissionais");
    }
  };
  
  const fetchPaymentMethods = async () => {
    try {
      const { data, error } = await supabase
        .from("payment_methods")
        .select("*")
        .eq("is_active", true)
        .order("name");
      
      if (error) throw error;
      setPaymentMethods(data || []);
    } catch (error) {
      console.error("Error fetching payment methods:", error);
      toast.error("Erro ao carregar métodos de pagamento");
    }
  };
  
  const generateTimeSlots = () => {
    const slots = [];
    for (let hour = 8; hour <= 20; hour++) {
      for (let minute = 0; minute < 60; minute += 15) {
        const formattedHour = hour.toString().padStart(2, "0");
        const formattedMinute = minute.toString().padStart(2, "0");
        slots.push(`${formattedHour}:${formattedMinute}`);
      }
    }
    setTimeSlots(slots);
  };
  
  const handleSubmit = async () => {
    if (!date || !time || !customer || !service || !professional) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Format date properly without timezone issues
      const formattedDate = formatDateForSupabase(date);
      console.log("Formatted date for submission:", formattedDate);
      
      const appointmentData = {
        date: formattedDate,
        time: `${time}:00`,
        customer_id: customer.id,
        service_id: service.id,
        primary_professional_id: professional.id,
        secondary_professional_id: secondaryProfessional?.id || null,
        payment_method_id: paymentMethod?.id || null,
        service_price: price,
        service_duration: duration,
        final_price: finalPrice,
        has_discount: hasDiscount,
        discount_percentage: hasDiscount ? discountPercentage : 0,
        notes: notes,
        is_completed: isCompleted,
        cancellation_reason: isCanceled ? cancellationReason : null,
      };
      
      console.log("Submitting appointment:", appointmentData);
      
      if (appointment) {
        // Update existing appointment
        const { error } = await supabase
          .from("appointments")
          .update(appointmentData)
          .eq("id", appointment.id);
        
        if (error) throw error;
        toast.success("Agendamento atualizado com sucesso");
      } else {
        // Create new appointment
        const { error } = await supabase
          .from("appointments")
          .insert(appointmentData);
        
        if (error) throw error;
        toast.success("Agendamento criado com sucesso");
      }
      
      onSubmit();
    } catch (error: any) {
      console.error("Error saving appointment:", error);
      toast.error(`Erro ao salvar agendamento: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleCustomerSelect = (selected: any) => {
    setCustomer(selected);
  };
  
  const getServiceDetails = (serviceId: string) => {
    return services.find((s) => s.id === serviceId);
  };
  
  const getProfessionalDetails = (professionalId: string) => {
    return professionals.find((p) => p.id === professionalId);
  };
  
  const getPaymentMethodDetails = (paymentMethodId: string) => {
    return paymentMethods.find((p) => p.id === paymentMethodId);
  };
  
  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">
            {appointment ? "Editar Agendamento" : "Novo Agendamento"}
          </DialogTitle>
        </DialogHeader>
        
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="grid grid-cols-2">
            <TabsTrigger value="details">Detalhes</TabsTrigger>
            <TabsTrigger value="status">Status</TabsTrigger>
          </TabsList>
          
          <TabsContent value="details" className="space-y-4 mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Cliente *</Label>
                  <CustomerSearch 
                    value={customer}
                    onSelect={handleCustomerSelect}
                    onSelectCustomer={handleCustomerSelect}
                    onCreateNew={() => {
                      toast.info("Funcionalidade de criação de cliente não está disponível");
                    }}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="service">Serviço *</Label>
                  <Select
                    value={service?.id || ""}
                    onValueChange={(value) => setService(getServiceDetails(value))}
                  >
                    <SelectTrigger id="service">
                      <SelectValue placeholder="Selecione o serviço" />
                    </SelectTrigger>
                    <SelectContent>
                      {services.map((service) => (
                        <SelectItem key={service.id} value={service.id}>
                          {service.name} - {formatTimeDisplay(service.duration)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="professional">Profissional *</Label>
                  <Select
                    value={professional?.id || ""}
                    onValueChange={(value) => setProfessional(getProfessionalDetails(value))}
                  >
                    <SelectTrigger id="professional">
                      <SelectValue placeholder="Selecione o profissional" />
                    </SelectTrigger>
                    <SelectContent>
                      {professionals.map((prof) => (
                        <SelectItem key={prof.id} value={prof.id}>
                          {prof.first_name} {prof.last_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                {service?.requires_two_professionals && (
                  <div className="space-y-2">
                    <Label htmlFor="secondary-professional">Profissional Auxiliar</Label>
                    <Select
                      value={secondaryProfessional?.id || ""}
                      onValueChange={(value) => setSecondaryProfessional(getProfessionalDetails(value))}
                    >
                      <SelectTrigger id="secondary-professional">
                        <SelectValue placeholder="Selecione o auxiliar" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Nenhum</SelectItem>
                        {professionals
                          .filter((p) => p.id !== professional?.id)
                          .map((prof) => (
                            <SelectItem key={prof.id} value={prof.id}>
                              {prof.first_name} {prof.last_name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Data *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !date && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {date ? format(date, "dd 'de' MMMM 'de' yyyy", { locale: ptBR }) : "Selecione a data"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={date}
                        onSelect={setDate}
                        initialFocus
                        className="p-3 pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="time">Horário *</Label>
                  <Select
                    value={time}
                    onValueChange={setTime}
                  >
                    <SelectTrigger id="time">
                      <SelectValue placeholder="Selecione o horário" />
                    </SelectTrigger>
                    <SelectContent>
                      {timeSlots.map((slot) => (
                        <SelectItem key={slot} value={slot}>
                          {slot}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="payment">Método de Pagamento</Label>
                  <Select
                    value={paymentMethod?.id || ""}
                    onValueChange={(value) => setPaymentMethod(getPaymentMethodDetails(value))}
                  >
                    <SelectTrigger id="payment">
                      <SelectValue placeholder="Selecione o método de pagamento" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Nenhum</SelectItem>
                      {paymentMethods.map((method) => (
                        <SelectItem key={method.id} value={method.id}>
                          {method.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="price">Preço</Label>
                <Input
                  id="price"
                  type="number"
                  value={price || ""}
                  onChange={(e) => setPrice(parseFloat(e.target.value) || undefined)}
                  placeholder="0,00"
                />
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="discount">Desconto</Label>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      checked={hasDiscount} 
                      onCheckedChange={(checked) => setHasDiscount(!!checked)}
                      id="has-discount"
                    />
                    <Label htmlFor="has-discount" className="text-sm">Aplicar desconto</Label>
                  </div>
                </div>
                <Input
                  id="discount"
                  type="number"
                  value={discountPercentage || ""}
                  onChange={(e) => setDiscountPercentage(parseFloat(e.target.value) || undefined)}
                  placeholder="0%"
                  disabled={!hasDiscount}
                  className="mb-1"
                />
                {hasDiscount && price && discountPercentage && (
                  <p className="text-xs text-muted-foreground">
                    Valor final: R$ {finalPrice?.toFixed(2)}
                  </p>
                )}
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="notes">Observações</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Observações sobre o agendamento"
                className="min-h-[80px]"
              />
            </div>
          </TabsContent>
          
          <TabsContent value="status" className="space-y-4 mt-4">
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  checked={isCompleted} 
                  onCheckedChange={(checked) => {
                    setIsCompleted(!!checked);
                    if (checked) setIsCanceled(false);
                  }}
                  id="is-completed"
                />
                <Label htmlFor="is-completed">Atendimento Realizado</Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox 
                  checked={isCanceled} 
                  onCheckedChange={(checked) => {
                    setIsCanceled(!!checked);
                    if (checked) setIsCompleted(false);
                  }}
                  id="is-canceled"
                />
                <Label htmlFor="is-canceled">Atendimento Cancelado</Label>
              </div>
              
              {isCanceled && (
                <div className="space-y-2 mt-4">
                  <Label htmlFor="cancellation-reason">Motivo do Cancelamento</Label>
                  <Textarea
                    id="cancellation-reason"
                    value={cancellationReason}
                    onChange={(e) => setCancellationReason(e.target.value)}
                    placeholder="Informe o motivo do cancelamento"
                    className="min-h-[80px]"
                  />
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Salvando..." : appointment ? "Atualizar" : "Criar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
