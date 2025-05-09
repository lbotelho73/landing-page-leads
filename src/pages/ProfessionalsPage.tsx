
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
import { ProfessionalForm } from "@/components/professionals/ProfessionalForm";
import { BulkDeleteButton } from "@/components/data/BulkDeleteButton";

export default function ProfessionalsPage() {
  const [professionals, setProfessionals] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProfessional, setSelectedProfessional] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  // Selection state for bulk actions
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  
  // Fetch professionals on component mount
  useEffect(() => {
    fetchProfessionals();
  }, []);
  
  // Handle select all checkbox
  useEffect(() => {
    if (selectAll) {
      setSelectedItems(professionals.map((professional: any) => professional.id));
    } else if (selectedItems.length === professionals.length) {
      // This is to handle the case when all items are selected individually
      // and then one is deselected
      setSelectAll(true);
    }
  }, [selectAll, professionals]);
  
  const fetchProfessionals = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("professionals")
        .select("*")
        .order("first_name", { ascending: true });
      
      if (error) throw error;
      
      setProfessionals(data || []);
    } catch (error) {
      console.error("Error fetching professionals:", error);
      toast.error("Erro ao carregar profissionais");
    } finally {
      setIsLoading(false);
    }
  };
  
  const toggleProfessionalStatus = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from("professionals")
        .update({ is_active: !currentStatus })
        .eq("id", id);
      
      if (error) throw error;
      
      setProfessionals(prev =>
        prev.map((professional: any) =>
          professional.id === id
            ? { ...professional, is_active: !currentStatus }
            : professional
        )
      );
      
      toast.success("Status atualizado com sucesso!");
    } catch (error) {
      console.error("Error updating professional status:", error);
      toast.error("Erro ao atualizar status");
    }
  };
  
  const handleAddEditSuccess = (professional: any, isEdit: boolean) => {
    if (isEdit) {
      setProfessionals(prev =>
        prev.map((p: any) => (p.id === professional.id ? professional : p))
      );
      toast.success("Profissional atualizado com sucesso!");
    } else {
      setProfessionals(prev => [...prev, professional]);
      toast.success("Profissional adicionado com sucesso!");
    }
    
    setShowAddDialog(false);
    setSelectedProfessional(null);
  };
  
  const editProfessional = (professional: any) => {
    setSelectedProfessional(professional);
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
        if (newSelections.length === professionals.length) {
          setSelectAll(true);
        }
        return newSelections;
      }
    });
  };
  
  const handleToggleSelectAll = (checked: boolean) => {
    setSelectAll(checked);
    setSelectedItems(checked ? professionals.map((professional: any) => professional.id) : []);
  };
  
  const handleDeleteSelected = async () => {
    if (selectedItems.length === 0) return;
    
    try {
      const { error } = await supabase
        .from("professionals")
        .delete()
        .in("id", selectedItems);
      
      if (error) throw error;
      
      fetchProfessionals();
      setSelectedItems([]);
      setSelectAll(false);
      toast.success(`${selectedItems.length} profissionais excluídos com sucesso!`);
    } catch (error) {
      console.error("Error deleting professionals:", error);
      toast.error("Erro ao excluir profissionais");
    }
  };
  
  const filteredProfessionals = professionals.filter((professional: any) => {
    const fullName = `${professional.first_name} ${professional.last_name}`.toLowerCase();
    return fullName.includes(searchTerm.toLowerCase());
  });
  
  return (
    <AppLayout>
      <div className="page-container">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Profissionais</h1>
          <Button 
            className="bg-massage-500 hover:bg-massage-600"
            onClick={() => {
              setSelectedProfessional(null);
              setShowAddDialog(true);
            }}
          >
            <PlusCircle className="mr-2 h-4 w-4" />
            Adicionar Profissional
          </Button>
        </div>
        
        <div className="flex justify-between items-center mb-4">
          <div className="relative w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar profissional..."
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
              tableName="professionals"
              onSuccess={fetchProfessionals}
            />
          </div>
        </div>
        
        {isLoading ? (
          <div className="text-center py-8">Carregando profissionais...</div>
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
                  <TableHead>Email</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Comissão (%)</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProfessionals.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center">
                      {searchTerm ? "Nenhum profissional encontrado" : "Nenhum profissional cadastrado"}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredProfessionals.map((professional: any) => (
                    <TableRow key={professional.id}>
                      <TableCell>
                        <Checkbox 
                          checked={selectedItems.includes(professional.id)}
                          onCheckedChange={() => handleToggleSelectItem(professional.id)}
                          aria-label={`Selecionar ${professional.first_name}`}
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        {professional.first_name} {professional.last_name}
                        {professional.alias_name && <span className="text-sm text-muted-foreground ml-2">({professional.alias_name})</span>}
                      </TableCell>
                      <TableCell>{professional.email}</TableCell>
                      <TableCell>{professional.phone}</TableCell>
                      <TableCell>{professional.commission_percentage}%</TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={professional.is_active}
                            onCheckedChange={() => toggleProfessionalStatus(professional.id, professional.is_active)}
                          />
                          <span className="text-sm">
                            {professional.is_active ? 
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
                          onClick={() => editProfessional(professional)}
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
                {selectedProfessional ? "Editar Profissional" : "Adicionar Profissional"}
              </DialogTitle>
            </DialogHeader>
            <ProfessionalForm
              professional={selectedProfessional}
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
              Tem certeza que deseja excluir {selectedItems.length} profissionais?
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
