
import { useState } from "react";
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, 
  DialogDescription, DialogFooter 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface BulkDeleteDialogProps {
  isOpen: boolean;
  onClose: () => void;
  tableType: "customers" | "professionals" | "services" | "appointments" | "marketing_channels";
  items: any[];
  onDeleteComplete: () => void;
  idField?: string;
  displayFields: string[];
  displayLabels: string[];
}

export function BulkDeleteDialog({ 
  isOpen, 
  onClose, 
  tableType, 
  items, 
  onDeleteComplete,
  idField = "id",
  displayFields,
  displayLabels
}: BulkDeleteDialogProps) {
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectAll, setSelectAll] = useState(false);

  const handleCheckItem = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedItems(prev => [...prev, id]);
    } else {
      setSelectedItems(prev => prev.filter(itemId => itemId !== id));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    setSelectAll(checked);
    if (checked) {
      setSelectedItems(items.map(item => item[idField]));
    } else {
      setSelectedItems([]);
    }
  };

  const getTableTitle = () => {
    switch(tableType) {
      case "customers": return "Clientes";
      case "professionals": return "Profissionais";
      case "services": return "Serviços";
      case "appointments": return "Agendamentos";
      case "marketing_channels": return "Canais de Marketing";
      default: return "Itens";
    }
  };

  const handleDelete = async () => {
    if (selectedItems.length === 0) {
      toast.warning("Selecione pelo menos um item para excluir");
      return;
    }

    if (!confirm(`Tem certeza que deseja excluir ${selectedItems.length} item(s)? Esta ação não pode ser desfeita.`)) {
      return;
    }

    setIsDeleting(true);
    try {
      // Using type assertion for the dynamic table name
      const { error } = await supabase
        .from(tableType as any)
        .delete()
        .in(idField, selectedItems);

      if (error) throw error;
      
      toast.success(`${selectedItems.length} item(s) excluído(s) com sucesso`);
      onDeleteComplete();
      onClose();
    } catch (error) {
      console.error("Error deleting items:", error);
      toast.error("Erro ao excluir itens");
    } finally {
      setIsDeleting(false);
    }
  };

  const formatDisplayValue = (item: any, field: string): string => {
    if (!item || !field) return '';
    
    // Handle nested fields (e.g., 'customer.name')
    if (field.includes('.')) {
      const parts = field.split('.');
      let value = item;
      for (const part of parts) {
        value = value?.[part];
      }
      return value || '';
    }
    
    return item[field]?.toString() || '';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Excluir {getTableTitle()}</DialogTitle>
          <DialogDescription>
            Selecione os itens que deseja excluir. Esta ação não pode ser desfeita.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[400px] overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox 
                    checked={selectAll} 
                    onCheckedChange={checked => handleSelectAll(!!checked)} 
                    aria-label="Selecionar todos"
                  />
                </TableHead>
                {displayLabels.map((label, index) => (
                  <TableHead key={index}>{label}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={displayFields.length + 1} className="text-center">
                    Nenhum item disponível
                  </TableCell>
                </TableRow>
              ) : (
                items.map(item => (
                  <TableRow key={item[idField]}>
                    <TableCell>
                      <Checkbox 
                        checked={selectedItems.includes(item[idField])}
                        onCheckedChange={checked => handleCheckItem(item[idField], !!checked)}
                        aria-label={`Selecionar item ${item[idField]}`}
                      />
                    </TableCell>
                    {displayFields.map((field, index) => (
                      <TableCell key={index} className="max-w-[200px] truncate">
                        {formatDisplayValue(item, field)}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <div className="flex justify-between items-center mt-4">
          <div className="text-sm text-muted-foreground">
            {selectedItems.length} de {items.length} itens selecionados
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={onClose} disabled={isDeleting}>
              Cancelar
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDelete} 
              disabled={selectedItems.length === 0 || isDeleting}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              {isDeleting ? "Excluindo..." : "Excluir Selecionados"}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
