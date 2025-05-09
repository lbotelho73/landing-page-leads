
import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileUp, FileDown } from "lucide-react";
import ptBR from "@/lib/i18n";
import { ExportDataTab } from "@/components/data/ExportDataTab";
import { ImportDataTab } from "@/components/data/ImportDataTab";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { checkAndInitializeTable } from "@/lib/database-helpers";
import { asDbTable } from "@/lib/database-types";

export default function DataPage() {
  const [activeTab, setActiveTab] = useState("export");
  const [tablesReady, setTablesReady] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  const tables = [
    { id: "customers", name: "Clientes" },
    { id: "professionals", name: "Profissionais" },
    { id: "services", name: "Serviços" },
    { id: "appointments", name: "Agendamentos" },
    { id: "payment_methods", name: "Métodos de Pagamento" },
    { id: "marketing_channels", name: "Canais de Marketing" },
    { id: "service_categories", name: "Categorias de Serviço" }
  ];

  // Check if tables exist
  useEffect(() => {
    const checkTables = async () => {
      try {
        setIsLoading(true);
        let allExist = true;
        
        // Check each table
        for (const table of tables) {
          const { exists } = await checkAndInitializeTable(asDbTable(table.id));
          if (!exists) {
            allExist = false;
            console.error(`Table ${table.id} does not exist`);
          }
        }
        
        setTablesReady(allExist);
        if (!allExist) {
          toast.error("Algumas tabelas necessárias não foram encontradas no banco de dados");
        }
      } catch (error) {
        console.error("Error checking tables:", error);
        toast.error("Erro ao verificar tabelas do banco de dados");
      } finally {
        setIsLoading(false);
      }
    };
    
    checkTables();
  }, []);
  
  return (
    <AppLayout>
      <div className="page-container">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">{ptBR.dataImportExport}</h1>
        </div>
        
        {isLoading ? (
          <Alert>
            <AlertDescription>
              Verificando tabelas do banco de dados...
            </AlertDescription>
          </Alert>
        ) : !tablesReady ? (
          <Alert variant="destructive">
            <AlertDescription>
              Algumas tabelas necessárias não foram encontradas no banco de dados.
              Por favor, verifique a configuração do banco de dados.
            </AlertDescription>
          </Alert>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList>
              <TabsTrigger value="export">
                <FileDown className="w-4 h-4 mr-2" />
                {ptBR.exportData}
              </TabsTrigger>
              <TabsTrigger value="import">
                <FileUp className="w-4 h-4 mr-2" />
                {ptBR.importData}
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="export" className="space-y-4">
              <ExportDataTab tables={tables} />
            </TabsContent>
            
            <TabsContent value="import" className="space-y-4">
              <ImportDataTab tables={tables} />
            </TabsContent>
          </Tabs>
        )}
      </div>
    </AppLayout>
  );
}
