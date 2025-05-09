
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
import { ProfessionalForm } from "@/components/professionals/ProfessionalForm";
import { BulkDeleteButton } from "@/components/data/BulkDeleteButton";

export default function ProfessionalsPage() {
  const [professionals, setProfessionals] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [selectedProfessional, setSelectedProfessional] = useState<any>(null);
  const [filteredProfessionals, setFilteredProfessionals] = useState<any[]>([]);
  
  // Fetch professionals on component mount
  useEffect(() => {
    fetchProfessionals();
  }, []);
  
  // Filter professionals when searchTerm changes
  useEffect(() => {
    const filtered = professionals.filter((professional) =>
      professional.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      professional.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      professional.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      professional.phone?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredProfessionals(filtered);
  }, [searchTerm, professionals]);
  
  const fetchProfessionals = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('professionals')
        .select('*')
        .order('first_name');
      
      if (error) throw error;
      
      console.log("Fetched professionals:", data);
      setProfessionals(data || []);
      setFilteredProfessionals(data || []);
    } catch (error: any) {
      console.error("Error fetching professionals:", error);
      toast.error(`Erro ao carregar profissionais: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleEditClick = (professional: any) => {
    setSelectedProfessional(professional);
    setShowForm(true);
  };
  
  const handleFormClose = () => {
    setShowForm(false);
    setSelectedProfessional(null);
  };
  
  const handleFormSubmit = () => {
    fetchProfessionals();
    handleFormClose();
  };
  
  const handleToggleStatus = async (id: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('professionals')
        .update({ is_active: !isActive })
        .eq('id', id);
      
      if (error) throw error;
      
      // Update local state
      setProfessionals(professionals.map(p => 
        p.id === id ? { ...p, is_active: !isActive } : p
      ));
      
      toast.success(`Status do profissional atualizado com sucesso`);
    } catch (error: any) {
      console.error("Error updating professional status:", error);
      toast.error(`Erro ao atualizar status: ${error.message}`);
    }
  };
  
  return (
    <AppLayout>
      <div className="page-container">
        <div className="flex flex-wrap gap-4 justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">{ptBR.professionals}</h1>
          
          <div className="flex flex-wrap gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Buscar profissionais..."
                className="w-full pl-8 md:w-[250px]"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <Button onClick={() => setShowForm(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Novo Profissional
            </Button>

            {/* Botão de exclusão em massa */}
            <BulkDeleteButton 
              tableType="professionals"
              buttonText="Excluir Selecionados"
              onDeleteComplete={fetchProfessionals}
              items={filteredProfessionals}
              displayFields={["first_name", "last_name", "email"]}
              displayLabels={["Nome", "Sobrenome", "Email"]}
            />
          </div>
        </div>
        
        {showForm && (
          <ProfessionalForm
            professional={selectedProfessional}
            onClose={handleFormClose}
            onSubmit={handleFormSubmit}
          />
        )}
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Profissionais</CardTitle>
            <CardDescription>
              Gerencie os profissionais do seu negócio.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center h-64">
                <p>Carregando profissionais...</p>
              </div>
            ) : filteredProfessionals.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Nenhum profissional encontrado.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Telefone</TableHead>
                      <TableHead>Comissão</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProfessionals.map((professional) => (
                      <TableRow key={professional.id}>
                        <TableCell>
                          {professional.first_name} {professional.last_name}
                          {professional.alias_name && (
                            <span className="text-sm text-muted-foreground block">
                              ({professional.alias_name})
                            </span>
                          )}
                        </TableCell>
                        <TableCell>{professional.email || "-"}</TableCell>
                        <TableCell>{professional.phone || "-"}</TableCell>
                        <TableCell>{professional.commission_percentage}%</TableCell>
                        <TableCell>
                          <Badge variant={professional.is_active ? "default" : "outline"}>
                            {professional.is_active ? "Ativo" : "Inativo"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => handleToggleStatus(professional.id, professional.is_active)}
                            >
                              {professional.is_active ? "Desativar" : "Ativar"}
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => handleEditClick(professional)}
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
