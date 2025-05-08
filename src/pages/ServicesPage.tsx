
import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { formatCurrency } from "@/lib/format";
import ptBR from "@/lib/i18n";
import { checkAndInitializeTable, logError, runQuery } from "@/lib/database-helpers";
import { Loader2 } from "lucide-react";

interface Service {
  id: string;
  name: string;
  description: string | null;
  duration: number;
  price: number;
  requires_two_professionals: boolean;
  is_active: boolean;
  service_category_id: string;
  professional_commission_percentage: number;
}

interface ServiceCategory {
  id: string;
  name: string;
}

export default function ServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [initializing, setInitializing] = useState(true);
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  
  const [serviceName, setServiceName] = useState("");
  const [serviceDescription, setServiceDescription] = useState("");
  const [serviceDuration, setServiceDuration] = useState("60");
  const [servicePrice, setServicePrice] = useState("");
  const [serviceCategory, setServiceCategory] = useState("");
  const [requiresTwoProfessionals, setRequiresTwoProfessionals] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [profCommissionPercentage, setProfCommissionPercentage] = useState("40");
  
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [serviceToDelete, setServiceToDelete] = useState<Service | null>(null);
  
  useEffect(() => {
    const init = async () => {
      setInitializing(true);
      // Check if tables exist first
      const servicesTableCheck = await checkAndInitializeTable('services');
      const categoriesTableCheck = await checkAndInitializeTable('service_categories');
      
      if (servicesTableCheck.exists && categoriesTableCheck.exists) {
        await Promise.all([fetchServices(), fetchCategories()]);
      } else {
        toast.error("Tabelas necessárias não encontradas. Verifique a configuração do banco de dados.");
      }
      setInitializing(false);
    };
    
    init();
  }, []);
  
  const fetchServices = async () => {
    setLoading(true);
    try {
      // First check if we can query services directly
      const { data: servicesData, error: servicesError } = await supabase
        .from('services')
        .select('*')
        .order('name');
        
      if (servicesError) throw servicesError;
      
      // Now fetch categories separately and join them manually
      const { data: categoriesData } = await supabase
        .from('service_categories')
        .select('id, name');
      
      // Map categories to services
      const serviceWithCategories = servicesData.map(service => {
        const category = categoriesData?.find(cat => cat.id === service.service_category_id);
        return {
          ...service,
          category_name: category?.name || ""
        };
      });
      
      setServices(serviceWithCategories || []);
    } catch (error) {
      console.error('Erro ao carregar serviços:', error);
      toast.error('Falha ao carregar serviços');
    } finally {
      setLoading(false);
    }
  };
  
  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('service_categories')
        .select('id, name')
        .eq('is_active', true)
        .order('name');
      
      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error('Erro ao carregar categorias:', error);
      toast.error('Falha ao carregar categorias de serviço');
    }
  };
  
  const resetForm = () => {
    setSelectedService(null);
    setServiceName("");
    setServiceDescription("");
    setServiceDuration("60");
    setServicePrice("");
    setServiceCategory("");
    setRequiresTwoProfessionals(false);
    setIsActive(true);
    setProfCommissionPercentage("40");
  };
  
  const handleEditService = (service: Service) => {
    setSelectedService(service);
    setServiceName(service.name);
    setServiceDescription(service.description || "");
    setServiceDuration(service.duration.toString());
    setServicePrice(service.price.toString());
    setServiceCategory(service.service_category_id);
    setRequiresTwoProfessionals(service.requires_two_professionals);
    setIsActive(service.is_active);
    setProfCommissionPercentage(service.professional_commission_percentage?.toString() || "40");
    setIsDialogOpen(true);
  };
  
  const handleDeleteService = (service: Service) => {
    setServiceToDelete(service);
    setIsDeleteDialogOpen(true);
  };
  
  const confirmDeleteService = async () => {
    if (!serviceToDelete) return;
    
    try {
      const { error } = await supabase
        .from('services')
        .delete()
        .eq('id', serviceToDelete.id);
      
      if (error) throw error;
      
      toast.success('Serviço excluído com sucesso');
      setServices(services.filter(s => s.id !== serviceToDelete.id));
      setIsDeleteDialogOpen(false);
      setServiceToDelete(null);
    } catch (error) {
      console.error('Erro ao excluir serviço:', error);
      toast.error('Falha ao excluir serviço');
    }
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!serviceCategory) {
      toast.error("Selecione uma categoria para o serviço");
      return;
    }
    
    const serviceData = {
      name: serviceName,
      description: serviceDescription || null,
      duration: parseInt(serviceDuration),
      price: parseFloat(servicePrice),
      requires_two_professionals: requiresTwoProfessionals,
      is_active: isActive,
      service_category_id: serviceCategory,
      professional_commission_percentage: parseFloat(profCommissionPercentage)
    };
    
    try {
      if (selectedService) {
        // Update existing service
        const { error } = await supabase
          .from('services')
          .update(serviceData)
          .eq('id', selectedService.id);
        
        if (error) throw error;
        
        toast.success('Serviço atualizado com sucesso');
      } else {
        // Create new service
        const { error } = await supabase
          .from('services')
          .insert([serviceData]);
        
        if (error) throw error;
        
        toast.success('Serviço criado com sucesso');
      }
      
      fetchServices(); // Refresh the list
      setIsDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error('Erro ao salvar serviço:', error);
      toast.error('Falha ao salvar serviço');
    }
  };
  
  const getCategoryName = (categoryId: string) => {
    const category = categories.find(c => c.id === categoryId);
    return category ? category.name : "-";
  };
  
  // If initializing, show loading state
  if (initializing) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center h-full">
          <Loader2 className="h-12 w-12 animate-spin text-massage-500 mb-4" />
          <p className="text-lg font-medium">Inicializando sistema...</p>
        </div>
      </AppLayout>
    );
  }
  
  return (
    <AppLayout>
      <div className="page-container">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">{ptBR.services}</h1>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-massage-500 hover:bg-massage-600" onClick={resetForm}>
                {ptBR.addService}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[550px]">
              <form onSubmit={handleSubmit}>
                <DialogHeader>
                  <DialogTitle>
                    {selectedService ? "Editar Serviço" : ptBR.addService}
                  </DialogTitle>
                  <DialogDescription>
                    {ptBR.serviceDetails}
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="serviceCategory">{ptBR.serviceCategory}</Label>
                    <Select 
                      value={serviceCategory} 
                      onValueChange={setServiceCategory}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione uma categoria" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.length === 0 ? (
                          <SelectItem value="no-category" disabled>
                            Nenhuma categoria disponível
                          </SelectItem>
                        ) : (
                          categories.map(category => (
                            <SelectItem key={category.id} value={category.id}>
                              {category.name}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="grid gap-2">
                    <Label htmlFor="serviceName">{ptBR.serviceName}</Label>
                    <Input 
                      id="serviceName" 
                      value={serviceName} 
                      onChange={(e) => setServiceName(e.target.value)} 
                      required 
                    />
                  </div>
                  
                  <div className="grid gap-2">
                    <Label htmlFor="serviceDescription">{ptBR.description}</Label>
                    <Textarea 
                      id="serviceDescription" 
                      value={serviceDescription} 
                      onChange={(e) => setServiceDescription(e.target.value)} 
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="serviceDuration">{ptBR.duration} ({ptBR.minutes})</Label>
                      <Input 
                        id="serviceDuration" 
                        type="number" 
                        min="15" 
                        step="15" 
                        value={serviceDuration} 
                        onChange={(e) => setServiceDuration(e.target.value)} 
                        required 
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="servicePrice">{ptBR.price} (R$)</Label>
                      <Input 
                        id="servicePrice" 
                        type="number" 
                        min="0" 
                        step="0.01" 
                        value={servicePrice} 
                        onChange={(e) => setServicePrice(e.target.value)} 
                        required 
                      />
                    </div>
                  </div>
                  
                  <div className="grid gap-2">
                    <Label htmlFor="profCommissionPercentage">{ptBR.commissionPercentage} (%)</Label>
                    <Input 
                      id="profCommissionPercentage" 
                      type="number" 
                      min="0" 
                      max="100" 
                      step="0.1" 
                      value={profCommissionPercentage} 
                      onChange={(e) => setProfCommissionPercentage(e.target.value)} 
                      required 
                    />
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Switch 
                      id="requiresTwoProfessionals" 
                      checked={requiresTwoProfessionals} 
                      onCheckedChange={setRequiresTwoProfessionals} 
                    />
                    <Label htmlFor="requiresTwoProfessionals">{ptBR.requiresTwoProfessionals}</Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Switch 
                      id="isActive" 
                      checked={isActive} 
                      onCheckedChange={setIsActive} 
                    />
                    <Label htmlFor="isActive">{isActive ? ptBR.active : ptBR.inactive}</Label>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    {ptBR.cancel}
                  </Button>
                  <Button type="submit" className="bg-massage-500 hover:bg-massage-600">
                    {ptBR.save}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle>Catálogo de Serviços</CardTitle>
            <CardDescription>Gerencie os serviços oferecidos pela clínica</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-4">{ptBR.loadingData}</div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{ptBR.serviceCategory}</TableHead>
                      <TableHead>{ptBR.name}</TableHead>
                      <TableHead>{ptBR.duration}</TableHead>
                      <TableHead>{ptBR.price}</TableHead>
                      <TableHead>{ptBR.commissionPercentage}</TableHead>
                      <TableHead>{ptBR.status}</TableHead>
                      <TableHead className="text-right">{ptBR.actions}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {services.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center">
                          Nenhum serviço cadastrado
                        </TableCell>
                      </TableRow>
                    ) : (
                      services.map((service) => (
                        <TableRow key={service.id} className={!service.is_active ? "bg-muted/50" : ""}>
                          <TableCell>{getCategoryName(service.service_category_id)}</TableCell>
                          <TableCell className="font-medium">{service.name}</TableCell>
                          <TableCell>{service.duration} min</TableCell>
                          <TableCell>{formatCurrency(service.price)}</TableCell>
                          <TableCell>{service.professional_commission_percentage || 40}%</TableCell>
                          <TableCell>
                            <div className={`inline-block px-2 py-1 text-xs rounded-full ${
                              service.is_active 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {service.is_active ? ptBR.active : ptBR.inactive}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => handleEditService(service)}
                              >
                                {ptBR.edit}
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => handleDeleteService(service)}
                                className="text-red-500 hover:text-red-700 hover:bg-red-100"
                              >
                                {ptBR.delete}
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
        
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{ptBR.confirmDelete}</AlertDialogTitle>
              <AlertDialogDescription>
                {ptBR.thisActionCannot}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{ptBR.cancel}</AlertDialogCancel>
              <AlertDialogAction 
                className="bg-red-500 hover:bg-red-600"
                onClick={confirmDeleteService}
              >
                {ptBR.delete}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AppLayout>
  );
}
