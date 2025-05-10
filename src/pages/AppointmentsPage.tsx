
import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PlusCircle, Search, Trash } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { AppointmentForm } from "@/components/appointments/AppointmentForm";
import { AppointmentStatusBadge } from "@/components/appointments/AppointmentStatusBadge";
import { AppointmentStatusSelect } from "@/components/appointments/AppointmentStatusSelect";
import { Checkbox } from "@/components/ui/checkbox";
import { BulkDeleteButton } from "@/components/data/BulkDeleteButton";

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState<any[]>([]);
  const [filteredAppointments, setFilteredAppointments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateRange, setDateRange] = useState<{ from: Date; to?: Date }>({ 
    from: new Date(), 
    to: undefined
  });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  // Selection state for bulk actions
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  
  // Load appointments on initial render
  useEffect(() => {
    fetchAppointments();
  }, []);
  
  // Filter appointments when filters change
  useEffect(() => {
    applyFilters();
  }, [appointments, searchTerm, statusFilter, dateRange]);
  
  // Handle select all checkbox
  useEffect(() => {
    if (selectAll) {
      setSelectedItems(filteredAppointments.map((appointment) => appointment.id));
    } else if (selectedItems.length === filteredAppointments.length && filteredAppointments.length > 0) {
      setSelectAll(true);
    }
  }, [selectAll, filteredAppointments]);
  
  const fetchAppointments = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("appointments")
        .select(`
          *,
          customers:customer_id (*),
          services:service_id (*),
          primary_professionals:primary_professional_id (*, alias_name),
          secondary_professionals:secondary_professional_id (*, alias_name),
          payment_methods:payment_method_id (*)
        `)
        .order("date", { ascending: false })
        .order("time", { ascending: true });
      
      if (error) throw error;
      
      setAppointments(data || []);
    } catch (error) {
      console.error("Error fetching appointments:", error);
      toast.error("Erro ao carregar agendamentos");
    } finally {
      setIsLoading(false);
    }
  };
  
  const applyFilters = () => {
    let filtered = [...appointments];
    
    // Apply search filter (customer name)
    if (searchTerm) {
      filtered = filtered.filter(appointment => {
        const customerName = `${appointment.customers?.first_name || ""} ${appointment.customers?.last_name || ""}`.toLowerCase();
        return customerName.includes(searchTerm.toLowerCase());
      });
    }
    
    // Apply status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter(appointment => {
        if (statusFilter === "completed") return appointment.is_completed;
        if (statusFilter === "pending") return !appointment.is_completed && !appointment.cancellation_reason;
        if (statusFilter === "cancelled") return !!appointment.cancellation_reason;
        return true;
      });
    }
    
    // Apply date range filter
    if (dateRange.from) {
      const fromDate = new Date(dateRange.from);
      fromDate.setHours(0, 0, 0, 0);
      
      filtered = filtered.filter(appointment => {
        const appointmentDate = new Date(appointment.date);
        
        if (dateRange.to) {
          const toDate = new Date(dateRange.to);
          toDate.setHours(23, 59, 59, 999);
          return appointmentDate >= fromDate && appointmentDate <= toDate;
        }
        
        return appointmentDate.getTime() === fromDate.getTime();
      });
    }
    
    setFilteredAppointments(filtered);
  };
  
  const handleAppointmentAdded = (newAppointment: any) => {
    setAppointments(prev => [newAppointment, ...prev]);
    setShowAddDialog(false);
    toast.success("Agendamento adicionado com sucesso!");
  };
  
  const handleAppointmentUpdated = (updatedAppointment: any) => {
    setAppointments(prev => 
      prev.map(appointment => 
        appointment.id === updatedAppointment.id ? updatedAppointment : appointment
      )
    );
    setSelectedAppointment(null);
    setShowAddDialog(false);
    toast.success("Agendamento atualizado com sucesso!");
  };
  
  const editAppointment = (appointment: any) => {
    setSelectedAppointment(appointment);
    setShowAddDialog(true);
  };
  
  const formatDateTime = (date: string, time: string) => {
    if (!date) return "Data não definida";
    
    try {
      const formattedDate = format(new Date(date), "PPP", { locale: ptBR });
      return `${formattedDate} às ${time || ""}`;
    } catch (error) {
      console.error("Error formatting date:", error);
      return "Data inválida";
    }
  };
  
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };
  
  const handleToggleSelectItem = (id: string) => {
    setSelectedItems(prev => {
      const isSelected = prev.includes(id);
      
      // If item is being deselected, ensure selectAll is false
      if (isSelected) {
        setSelectAll(false);
        return prev.filter(itemId => itemId !== id);
      } else {
        // Check if this selection means all items are now selected
        const newSelections = [...prev, id];
        if (newSelections.length === filteredAppointments.length) {
          setSelectAll(true);
        }
        return newSelections;
      }
    });
  };
  
  const handleToggleSelectAll = (checked: boolean) => {
    setSelectAll(checked);
    setSelectedItems(checked ? filteredAppointments.map(appointment => appointment.id) : []);
  };
  
  const handleDeleteSelected = async () => {
    if (selectedItems.length === 0) return;
    
    try {
      const { error } = await supabase
        .from("appointments")
        .delete()
        .in("id", selectedItems);
      
      if (error) throw error;
      
      fetchAppointments();
      setSelectedItems([]);
      setSelectAll(false);
      toast.success(`${selectedItems.length} agendamentos excluídos com sucesso!`);
    } catch (error) {
      console.error("Error deleting appointments:", error);
      toast.error("Erro ao excluir agendamentos");
    }
  };
  
  return (
    <AppLayout>
      <div className="page-container">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Agendamentos</h1>
          <Button 
            className="bg-massage-500 hover:bg-massage-600"
            onClick={() => {
              setSelectedAppointment(null);
              setShowAddDialog(true);
            }}
          >
            <PlusCircle className="mr-2 h-4 w-4" />
            Novo Agendamento
          </Button>
        </div>
        
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle>Filtros</CardTitle>
            <CardDescription>
              Filtre os agendamentos por data, status ou cliente
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar cliente..."
                  className="pl-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              
              <AppointmentStatusSelect
                value={statusFilter}
                onValueChange={setStatusFilter}
                includeAll={true}
              />
              
              <DateRangePicker
                value={dateRange}
                onChange={setDateRange}
              />
            </div>
          </CardContent>
        </Card>
        
        <div className="flex justify-between items-center mb-4">
          <div className="text-sm text-muted-foreground">
            {filteredAppointments.length} agendamentos encontrados
          </div>
          <div className="flex items-center gap-2">
            {selectedItems.length > 0 && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setShowDeleteConfirm(true)}
              >
                <Trash className="mr-1 h-4 w-4" />
                Excluir ({selectedItems.length})
              </Button>
            )}
            <BulkDeleteButton
              tableName="appointments"
              onSuccess={fetchAppointments}
            />
          </div>
        </div>
        
        {isLoading ? (
          <div className="text-center py-8">Carregando agendamentos...</div>
        ) : (
          <div className="border rounded-md overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox 
                      checked={selectAll}
                      onCheckedChange={handleToggleSelectAll}
                      aria-label="Selecionar todos"
                    />
                  </TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Serviço</TableHead>
                  <TableHead>Profissional</TableHead>
                  <TableHead>Data e Hora</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAppointments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center">
                      Nenhum agendamento encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredAppointments.map((appointment) => (
                    <TableRow key={appointment.id}>
                      <TableCell>
                        <Checkbox 
                          checked={selectedItems.includes(appointment.id)}
                          onCheckedChange={() => handleToggleSelectItem(appointment.id)}
                          aria-label={`Selecionar agendamento de ${appointment.customers?.first_name || ''}`}
                        />
                      </TableCell>
                      <TableCell>
                        <AppointmentStatusBadge 
                          status={appointment.is_completed ? "completed" : (appointment.cancellation_reason ? "canceled" : "scheduled")}
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        {appointment.customers?.first_name} {appointment.customers?.last_name}
                      </TableCell>
                      <TableCell>{appointment.services?.name}</TableCell>
                      <TableCell>
                        {appointment.primary_professionals?.alias_name || 
                         `${appointment.primary_professionals?.first_name || ''} ${appointment.primary_professionals?.last_name || ''}`}
                      </TableCell>
                      <TableCell>{formatDateTime(appointment.date, appointment.time)}</TableCell>
                      <TableCell>{formatCurrency(appointment.final_price)}</TableCell>
                      <TableCell className="text-right">
                        <Button 
                          variant="ghost" 
                          onClick={() => editAppointment(appointment)}
                        >
                          Editar
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}
        
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {selectedAppointment ? "Editar Agendamento" : "Novo Agendamento"}
              </DialogTitle>
            </DialogHeader>
            <AppointmentForm
              appointment={selectedAppointment}
              onAppointmentAdded={handleAppointmentAdded}
              onAppointmentUpdated={handleAppointmentUpdated}
            />
          </DialogContent>
        </Dialog>
        
        <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirmar exclusão</DialogTitle>
            </DialogHeader>
            <p>
              Tem certeza que deseja excluir {selectedItems.length} agendamentos?
              Esta ação não poderá ser desfeita.
            </p>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>
                Cancelar
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  handleDeleteSelected();
                  setShowDeleteConfirm(false);
                }}
              >
                Excluir
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
