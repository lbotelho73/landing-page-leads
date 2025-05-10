
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { BulkDeleteDialog } from "./BulkDeleteDialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { asDbTable } from "@/lib/database-types";

export interface BulkDeleteButtonProps {
  tableName: string;
  onSuccess: () => void;
  displayFields?: string[];
  displayLabels?: string[];
  buttonText?: string;
  buttonVariant?: string;
}

export function BulkDeleteButton({
  tableName,
  onSuccess,
  displayFields = ["id"],
  displayLabels = ["ID"],
  buttonText = "Importação em Massa",
  buttonVariant = "outline",
}: BulkDeleteButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const handleOpen = async () => {
    setLoading(true);
    try {
      // Fetch all items from the table
      const { data, error } = await supabase
        .from(asDbTable(tableName))
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      setItems(data || []);
      setIsOpen(true);
    } catch (error: any) {
      toast.error(`Erro ao carregar dados: ${error.message || String(error)}`);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  const handleDelete = async (selectedIds: string[]) => {
    if (!selectedIds.length) return;

    try {
      // Delete selected items
      const { error } = await supabase
        .from(asDbTable(tableName))
        .delete()
        .in("id", selectedIds);

      if (error) throw error;

      toast.success(`${selectedIds.length} itens excluídos com sucesso`);
      onSuccess();
    } catch (error: any) {
      toast.error(`Erro ao excluir itens: ${error.message || String(error)}`);
    } finally {
      setIsOpen(false);
    }
  };

  return (
    <>
      <Button
        variant={buttonVariant as any}
        size="sm"
        onClick={handleOpen}
        disabled={loading}
      >
        <Trash2 className="mr-2 h-4 w-4" />
        {buttonText}
      </Button>

      <BulkDeleteDialog
        open={isOpen}
        onOpenChange={setIsOpen}
        items={items}
        onDelete={handleDelete}
        onCancel={handleClose}
        tableType={tableName}
        displayFields={displayFields}
        displayLabels={displayLabels}
      />
    </>
  );
}
