
import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { PlusCircle, Check, X, Search, Trash } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ServiceForm } from "@/components/services/ServiceForm";
import { BulkDeleteButton } from "@/components/data/BulkDeleteButton";

export default function ServicesPage() {
  const [services, setServices] = useState([]);
  const [categories, setCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedService, setSelectedService] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  // Selection state for bulk actions
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  
  // Fetch services and categories on component mount
  useEffect(() => {
    fetchServicesAndCategories();
  }, []);
  
  // Handle select all checkbox
  useEffect(() => {
    if (selectAll) {
      setSelectedItems(services.map((service: any) => service.id));
    } else if (selectedItems.length === services.length) {
      setSelectAll(true);
    }
  }, [selectAll, services]);
  
  const fetchServicesAndCategories = async () => {
    setIsLoading(true);
    try {
      // Fetch categories first
      const { data: categoriesData, error: categoriesError } = await supabase
        .from("service_categories")
        .select("*")
        .order("name", { ascending: true });
      
      if (categoriesError) throw categoriesError;
      
      setCategories(categoriesData || []);
      
      // Then fetch services with category info
      const { data: servicesData, error: servicesError } = await supabase
        .from("services")
        .select(`
          *,
          service_categories:service_category_id (
            id,
            name
          )
        `)
        .order("name", { ascending: true });
      
      if (servicesError) throw servicesError;
      
      setServices(servicesData || []);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Erro ao carregar serviços");
    } finally {
      setIsLoading(false);
    }
  };
  
  const toggleServiceStatus = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from("services")
        .update({ is_active: !currentStatus })
        .eq("id", id);
      
      if (error) throw error;
      
      setServices(prev =>
        prev.map((service: any) =>
          service.id === id
            ? { ...service, is_active: !currentStatus }
            : service
        )
      );
      
      toast.success("Status atualizado com sucesso!");
    } catch (error) {
      console.error("Error updating service status:", error);
      toast.error("Erro ao atualizar status");
    }
  };
  
  const handleAddEditSuccess = (service: any, isEdit: boolean) => {
    if (isEdit) {
      setServices(prev =>
        prev.map((s: any) => (s.id === service.id ? service : s))
      );
      toast.success("Serviço atualizado com sucesso!");
    } else {
      setServices(prev => [...prev, service]);
      toast.success("Serviço adicionado com sucesso!");
    }
    
    setShowAddDialog(false);
    setSelectedService(null);
  };
  
  const editService = (service: any) => {
    setSelectedService(service);
    setShowAddDialog(true);
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
        if (newSelections.length === services.length) {
          setSelectAll(true);
        }
        return newSelections;
      }
    });
  };
  
  const handleToggleSelectAll = (checked: boolean) => {
    setSelectAll(checked);
    setSelectedItems(checked ? services.map((service: any) => service.id) : []);
  };
  
  const handleDeleteSelected = async () => {
    if (selectedItems.length === 0) return;
    
    try {
      const { error } = await supabase
        .from("services")
        .delete()
        .in("id", selectedItems);
      
      if (error) throw error;
      
      fetchServicesAndCategories();
      setSelectedItems([]);
      setSelectAll(false);
      toast.success(`${selectedItems.length} serviços excluídos com sucesso!`);
    } catch (error) {
      console.error("Error deleting services:", error);
      toast.error("Erro ao excluir serviços");
    }
  };
  
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };
  
  const filteredServices = services.filter((service: any) => {
    const serviceName = service.name.toLowerCase();
    return serviceName.includes(searchTerm.toLowerCase());
  });
  
  return (
    <AppLayout>
      <div className="page-container">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Serviços</h1>
          <Button 
            className="bg-massage-500 hover:bg-massage-600"
            onClick={() => {
              setSelectedService(null);
              setShowAddDialog(true);
            }}
          >
            <PlusCircle className="mr-2 h-4 w-4" />
            Adicionar Serviço
          </Button>
        </div>
        
        <div className="flex justify-between items-center mb-4">
          <div className="relative w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar serviço..."
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
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
              tableName="services"
              onSuccess={fetchServicesAndCategories}
            />
          </div>
        </div>
        
        {isLoading ? (
          <div className="text-center py-8">Carregando serviços...</div>
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
                  <TableHead>Nome</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Duração</TableHead>
                  <TableHead>Preço</TableHead>
                  <TableHead>Comissão</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredServices.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center">
                      {searchTerm ? "Nenhum serviço encontrado" : "Nenhum serviço cadastrado"}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredServices.map((service: any) => (
                    <TableRow key={service.id}>
                      <TableCell>
                        <Checkbox 
                          checked={selectedItems.includes(service.id)}
                          onCheckedChange={() => handleToggleSelectItem(service.id)}
                          aria-label={`Selecionar ${service.name}`}
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        {service.name}
                      </TableCell>
                      <TableCell>
                        {service.service_categories?.name || "Sem categoria"}
                      </TableCell>
                      <TableCell>{service.duration} min</TableCell>
                      <TableCell>{formatCurrency(service.price)}</TableCell>
                      <TableCell>{service.professional_commission_percentage}%</TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={service.is_active}
                            onCheckedChange={() => toggleServiceStatus(service.id, service.is_active)}
                          />
                          <span className="text-sm">
                            {service.is_active ? 
                              <span className="text-green-600 flex items-center">
                                <Check size={16} className="mr-1" /> Ativo
                              </span> : 
                              <span className="text-gray-500 flex items-center">
                                <X size={16} className="mr-1" /> Inativo
                              </span>
                            }
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button 
                          variant="ghost" 
                          onClick={() => editService(service)}
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
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {selectedService ? "Editar Serviço" : "Adicionar Serviço"}
              </DialogTitle>
            </DialogHeader>
            <ServiceForm
              service={selectedService}
              categories={categories}
              onSuccess={handleAddEditSuccess}
            />
          </DialogContent>
        </Dialog>
        
        <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirmar exclusão</DialogTitle>
            </DialogHeader>
            <p>
              Tem certeza que deseja excluir {selectedItems.length} serviços?
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
