
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Trash } from "lucide-react";
import { BulkDeleteDialog } from "./BulkDeleteDialog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { DatabaseTablesType, asDbTable } from "@/lib/database-types";

// Define the props interface for the component
export interface BulkDeleteButtonProps {
  tableName: DatabaseTablesType;
  customFilter?: Record<string, any>;
  onSuccess?: () => void;
  buttonText?: string;
  buttonVariant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
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
      
      // Use the asDbTable utility to properly handle the table name type
      // This resolves both type errors
      const dbTable = asDbTable(tableName);
      
      const deleteQuery = supabase
        .from(dbTable)
        .delete();
      
      // Apply custom filter if provided
      let finalQuery = deleteQuery;
      if (customFilter) {
        Object.entries(customFilter).forEach(([column, value]) => {
          finalQuery = finalQuery.eq(column, value);
        });
      } else {
        // If no filter provided, confirm we want to delete all
        finalQuery = finalQuery.neq('id', null);
      }
      
      const { error } = await finalQuery;
      
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
        variant={buttonVariant}
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
