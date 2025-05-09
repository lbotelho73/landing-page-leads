
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Trash } from "lucide-react";
import { BulkDeleteDialog } from "./BulkDeleteDialog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { DatabaseTablesType } from "@/lib/database-types";

// Define the props interface for the component
export interface BulkDeleteButtonProps {
  tableName: DatabaseTablesType | string;
  customFilter?: Record<string, any>;
  onSuccess?: () => void;
  buttonText?: string;
  buttonVariant?: string;
}

export function BulkDeleteButton({ 
  tableName, 
  customFilter, 
  onSuccess,
  buttonText = "Excluir Todos",
  buttonVariant = "destructive"
}: BulkDeleteButtonProps) {
  const [showDialog, setShowDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const executeDelete = async () => {
    setIsDeleting(true);
    
    try {
      console.log(`Executing bulk delete on table: ${tableName}`);
      
      // Use type casting to handle dynamic table name
      // This avoids the "excessively deep and possibly infinite" type error
      let query = supabase
        .from(tableName as any)
        .delete();
      
      // Apply custom filter if provided
      if (customFilter) {
        Object.entries(customFilter).forEach(([column, value]) => {
          query = query.eq(column, value);
        });
      } else {
        // If no filter provided, confirm with Supabase that we want to delete all
        query = query.filter('id', 'neq', null);
      }
      
      const { error } = await query;
      
      if (error) throw error;
      
      console.log(`Deleted records from ${tableName}`);
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
        variant={buttonVariant as any}
        size="sm"
        onClick={() => setShowDialog(true)}
      >
        <Trash className="h-4 w-4 mr-2" />
        {buttonText}
      </Button>
      
      <BulkDeleteDialog 
        open={showDialog}
        onOpenChange={setShowDialog}
        onConfirm={executeDelete}
        isDeleting={isDeleting}
        entityName={String(tableName)}
      />
    </>
  );
}
