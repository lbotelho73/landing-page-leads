
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Trash } from "lucide-react";
import { BulkDeleteDialog } from "./BulkDeleteDialog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface BulkDeleteButtonProps {
  tableName: string;
  customFilter?: Record<string, any>;
  onSuccess?: () => void;
}

export function BulkDeleteButton({ tableName, customFilter, onSuccess }: BulkDeleteButtonProps) {
  const [showDialog, setShowDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const executeDelete = async () => {
    setIsDeleting(true);
    
    try {
      console.log(`Executing bulk delete on table: ${tableName}`);
      
      let query = supabase.from(tableName).delete();
      
      // Apply custom filter if provided
      if (customFilter) {
        Object.entries(customFilter).forEach(([column, value]) => {
          query = query.eq(column, value);
        });
      } else {
        // If no filter provided, confirm with Supabase that we want to delete all
        query = query.filter('id', 'neq', null);
      }
      
      const { error, count } = await query;
      
      if (error) throw error;
      
      console.log(`Deleted records from ${tableName}:`, count);
      toast.success(`Registros excluídos com sucesso!`);
      
      if (onSuccess) {
        onSuccess();
      }
      
      setShowDialog(false);
    } catch (error: any) {
      console.error("Error during bulk delete:", error);
      toast.error(`Erro ao excluir registros: ${error.message || 'Erro desconhecido'}`);
    } finally {
      setIsDeleting(false);
    }
  };
  
  return (
    <>
      <Button
        variant="destructive"
        size="sm"
        onClick={() => setShowDialog(true)}
      >
        <Trash className="h-4 w-4 mr-2" />
        Excluir Todos
      </Button>
      
      <BulkDeleteDialog 
        open={showDialog}
        onOpenChange={setShowDialog}
        onConfirm={executeDelete}
        isDeleting={isDeleting}
        entityName={tableName}
      />
    </>
  );
}
