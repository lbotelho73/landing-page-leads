
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Loader2 } from "lucide-react";

interface BulkDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isDeleting: boolean;
  entityName: string;
}

export function BulkDeleteDialog({
  open,
  onOpenChange,
  onConfirm,
  isDeleting,
  entityName
}: BulkDeleteDialogProps) {
  // Map table names to more user-friendly names
  const getEntityDisplayName = (name: string) => {
    const nameMap: Record<string, string> = {
      customers: "clientes",
      professionals: "profissionais",
      services: "serviços",
      appointments: "agendamentos",
      payment_methods: "métodos de pagamento",
      marketing_channels: "canais de marketing",
      service_categories: "categorias de serviço"
    };
    
    return nameMap[name] || name;
  };
  
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
          <AlertDialogDescription>
            Esta ação excluirá permanentemente todos os {getEntityDisplayName(entityName)} do banco de dados.
            Esta ação não pode ser desfeita.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              onConfirm();
            }}
            disabled={isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Excluindo...
              </>
            ) : (
              "Sim, excluir tudo"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
