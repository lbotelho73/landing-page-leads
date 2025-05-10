
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";

export interface BulkDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tableType: string;
  items: any[];
  onDelete: (selectedIds: string[]) => Promise<void>;
  onCancel: () => void;
  displayFields: string[];
  displayLabels: string[];
}

export function BulkDeleteDialog({
  open,
  onOpenChange,
  tableType,
  items,
  onDelete,
  onCancel,
  displayFields,
  displayLabels,
}: BulkDeleteDialogProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [confirmText, setConfirmText] = useState("");
  
  const filteredItems = items.filter(item => {
    // Search across all display fields
    return displayFields.some(field => {
      const value = item[field];
      if (typeof value === 'string') {
        return value.toLowerCase().includes(searchTerm.toLowerCase());
      }
      return false;
    });
  });
  
  const handleSelectAll = (checked: boolean) => {
    setSelectAll(checked);
    setSelectedIds(checked ? filteredItems.map(item => item.id) : []);
  };
  
  const handleSelectItem = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds(prev => [...prev, id]);
    } else {
      setSelectedIds(prev => prev.filter(itemId => itemId !== id));
      setSelectAll(false);
    }
  };
  
  const handleDelete = async () => {
    await onDelete(selectedIds);
    setSelectedIds([]);
    setSelectAll(false);
  };

  const getFormattedValue = (item: any, field: string): string => {
    const value = item[field];
    if (value === null || value === undefined) return "-";
    
    // Format date fields
    if (
      field.includes("date") || 
      field.includes("created_at") || 
      field.includes("updated_at")
    ) {
      try {
        return format(new Date(value), "dd/MM/yyyy HH:mm");
      } catch {
        return String(value);
      }
    }
    
    // Format boolean values
    if (typeof value === "boolean") {
      return value ? "Sim" : "Não";
    }
    
    return String(value);
  };

  const tableName = {
    customers: "clientes",
    professionals: "profissionais",
    services: "serviços",
    appointments: "agendamentos",
    payment_methods: "métodos de pagamento",
    marketing_channels: "canais de marketing",
    service_categories: "categorias de serviço"
  }[tableType] || tableType;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Exclusão em massa de {tableName}</DialogTitle>
          <DialogDescription>
            Selecione os itens que deseja excluir. Esta ação não pode ser desfeita.
          </DialogDescription>
        </DialogHeader>
        
        {items.length === 0 ? (
          <div className="py-4 text-center text-muted-foreground">
            Nenhum item encontrado para excluir.
          </div>
        ) : (
          <>
            <div className="py-2">
              <Input
                placeholder="Buscar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="mb-2"
              />
              
              <div className="flex items-center space-x-2 mb-2">
                <Checkbox
                  id="select-all"
                  checked={selectAll}
                  onCheckedChange={handleSelectAll}
                />
                <Label htmlFor="select-all">Selecionar todos</Label>
              </div>
              
              <div className="border rounded overflow-hidden flex-grow overflow-y-auto" style={{ maxHeight: "40vh" }}>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12"></TableHead>
                      {displayLabels.map((label, index) => (
                        <TableHead key={index}>{label}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredItems.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedIds.includes(item.id)}
                            onCheckedChange={(checked) => handleSelectItem(item.id, !!checked)}
                          />
                        </TableCell>
                        {displayFields.map((field, index) => (
                          <TableCell key={index}>{getFormattedValue(item, field)}</TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
            
            {selectedIds.length > 0 && (
              <div className="py-2 space-y-4">
                <p className="text-sm font-medium">
                  {selectedIds.length} itens selecionados para exclusão
                </p>
                <div className="space-y-2">
                  <Label htmlFor="confirm-delete">
                    Digite "EXCLUIR" para confirmar a exclusão
                  </Label>
                  <Input
                    id="confirm-delete"
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value)}
                  />
                </div>
              </div>
            )}
          </>
        )}
        
        <DialogFooter>
          <Button
            variant="outline"
            onClick={onCancel}
          >
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={
              selectedIds.length === 0 ||
              confirmText !== "EXCLUIR"
            }
          >
            Excluir {selectedIds.length} itens
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
