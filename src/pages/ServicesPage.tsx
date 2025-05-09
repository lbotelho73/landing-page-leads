
import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import ptBR from "@/lib/i18n";
import { ServiceForm } from "@/components/services/ServiceForm";
import { formatCurrency } from "@/lib/format";
import { BulkDeleteButton } from "@/components/data/BulkDeleteButton";

export default function ServicesPage() {
  const [services, setServices] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [selectedService, setSelectedService] = useState<any>(null);
  const [filteredServices, setFilteredServices] = useState<any[]>([]);
  
  // Fetch services on component mount
  useEffect(() => {
    fetchServices();
  }, []);
  
  // Filter services when searchTerm changes
  useEffect(() => {
    const filtered = services.filter((service) =>
      service.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      service.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      service.category?.name?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredServices(filtered);
  }, [searchTerm, services]);
  
  const fetchServices = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('services')
        .select(`
          *,
          category:service_category_id(name)
        `)
        .order('name');
      
      if (error) throw error;
      
      console.log("Fetched services:", data);
      setServices(data || []);
      setFilteredServices(data || []);
    } catch (error: any) {
      console.error("Error fetching services:", error);
      toast.error(`Erro ao carregar serviços: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleEditClick = (service: any) => {
    setSelectedService(service);
    setShowForm(true);
  };
  
  const handleFormClose = () => {
    setShowForm(false);
    setSelectedService(null);
  };
  
  const handleFormSubmit = () => {
    fetchServices();
    handleFormClose();
  };
  
  const handleToggleStatus = async (id: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('services')
        .update({ is_active: !isActive })
        .eq('id', id);
      
      if (error) throw error;
      
      // Update local state
      setServices(services.map(s => 
        s.id === id ? { ...s, is_active: !isActive } : s
      ));
      
      toast.success(`Status do serviço atualizado com sucesso`);
    } catch (error: any) {
      console.error("Error updating service status:", error);
      toast.error(`Erro ao atualizar status: ${error.message}`);
    }
  };
  
  return (
    <AppLayout>
      <div className="page-container">
        <div className="flex flex-wrap gap-4 justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">{ptBR.services}</h1>
          
          <div className="flex flex-wrap gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Buscar serviços..."
                className="w-full pl-8 md:w-[250px]"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <Button onClick={() => setShowForm(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Novo Serviço
            </Button>

            {/* Botão de exclusão em massa */}
            <BulkDeleteButton 
              tableType="services"
              buttonText="Excluir Selecionados"
              onDeleteComplete={fetchServices}
              items={filteredServices}
              displayFields={["name", "duration", "price"]}
              displayLabels={["Nome", "Duração (min)", "Preço"]}
            />
          </div>
        </div>
        
        {showForm && (
          <ServiceForm
            service={selectedService}
            onClose={handleFormClose}
            onSubmit={handleFormSubmit}
          />
        )}
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Serviços</CardTitle>
            <CardDescription>
              Gerencie os serviços oferecidos pelo seu negócio.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center h-64">
                <p>Carregando serviços...</p>
              </div>
            ) : filteredServices.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Nenhum serviço encontrado.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
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
                    {filteredServices.map((service) => (
                      <TableRow key={service.id}>
                        <TableCell>{service.name}</TableCell>
                        <TableCell>{service.category?.name || "-"}</TableCell>
                        <TableCell>{service.duration} min</TableCell>
                        <TableCell>{formatCurrency(service.price)}</TableCell>
                        <TableCell>{service.professional_commission_percentage}%</TableCell>
                        <TableCell>
                          <Badge variant={service.is_active ? "default" : "outline"}>
                            {service.is_active ? "Ativo" : "Inativo"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => handleToggleStatus(service.id, service.is_active)}
                            >
                              {service.is_active ? "Desativar" : "Ativar"}
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => handleEditClick(service)}
                            >
                              Editar
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
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
