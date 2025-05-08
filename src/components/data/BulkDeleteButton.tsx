
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { BulkDeleteDialog } from "./BulkDeleteDialog";
import { DatabaseTablesType } from "@/database.types";

interface BulkDeleteButtonProps {
  tableType: DatabaseTablesType | "marketing_channels"; // Allow "marketing_channels" explicitly
  buttonVariant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  buttonText?: string;
  onDeleteComplete: () => void;
  idField?: string;
  displayFields: string[];
  displayLabels: string[];
  items: any[];
}

export function BulkDeleteButton({
  tableType,
  buttonVariant = "destructive",
  buttonText,
  onDeleteComplete,
  items,
  idField = "id",
  displayFields,
  displayLabels
}: BulkDeleteButtonProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const getDefaultText = () => {
    switch(tableType) {
      case "customers": return "Excluir Clientes";
      case "professionals": return "Excluir Profissionais";
      case "services": return "Excluir Serviços";
      case "appointments": return "Excluir Agendamentos";
      case "marketing_channels": return "Excluir Canais";
      default: return "Excluir Itens";
    }
  };

  return (
    <>
      <Button 
        variant={buttonVariant} 
        onClick={() => setIsDialogOpen(true)}
        disabled={items.length === 0}
      >
        <Trash2 className="h-4 w-4 mr-2" />
        {buttonText || getDefaultText()}
      </Button>
      
      <BulkDeleteDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        tableType={tableType as any}
        items={items}
        onDeleteComplete={onDeleteComplete}
        idField={idField}
        displayFields={displayFields}
        displayLabels={displayLabels}
      />
    </>
  );
}
