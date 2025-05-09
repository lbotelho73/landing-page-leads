
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import ptBR from "@/lib/i18n";
import { XLSX, jsonToExcel } from "@/lib/xlsx-utils";
import { asDbTable, DatabaseTablesType, DatabaseViewsType } from "@/lib/database-types";

interface ExportDataTabProps {
  tables: { id: string; name: string }[];
}

export function ExportDataTab({ tables }: ExportDataTabProps) {
  const [exportFormat, setExportFormat] = useState("xlsx");
  const [exportTable, setExportTable] = useState<string>("customers");
  const [isExporting, setIsExporting] = useState(false);
  
  const handleExport = async () => {
    setIsExporting(true);
    try {
      // Use type assertion to handle dynamic table name
      const { data, error } = await supabase
        .from(exportTable)
        .select('*');
      
      if (error) throw error;
      
      if (!data || data.length === 0) {
        toast.warning(`Não há dados para exportar na tabela ${exportTable}`);
        return;
      }
      
      // Convert to the requested format
      let fileContent;
      let fileName;
      let mimeType;
      
      if (exportFormat === "xlsx") {
        fileContent = jsonToExcel(data);
        fileName = `${exportTable}_${new Date().toISOString()}.xlsx`;
        mimeType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
      } else if (exportFormat === "csv") {
        // Generate CSV
        const ws = XLSX.utils.json_to_sheet(data);
        const csv = XLSX.utils.sheet_to_csv(ws);
        fileContent = new Blob([csv], { type: 'text/csv' });
        fileName = `${exportTable}_${new Date().toISOString()}.csv`;
        mimeType = "text/csv";
      } else {
        // JSON
        fileContent = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        fileName = `${exportTable}_${new Date().toISOString()}.json`;
        mimeType = "application/json";
      }
      
      // Create download link
      const url = URL.createObjectURL(fileContent);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success(`Dados exportados com sucesso no formato ${exportFormat.toUpperCase()}`);
    } catch (error) {
      console.error("Erro ao exportar dados:", error);
      toast.error("Erro ao exportar dados");
    } finally {
      setIsExporting(false);
    }
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>{ptBR.exportData}</CardTitle>
        <CardDescription>Exporte dados do sistema para análise externa</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Tabela para exportar</label>
            <Select value={exportTable} onValueChange={setExportTable}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma tabela" />
              </SelectTrigger>
              <SelectContent>
                {tables.map(table => (
                  <SelectItem key={table.id} value={table.id}>
                    {table.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">{ptBR.fileFormat}</label>
            <Select value={exportFormat} onValueChange={setExportFormat}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="xlsx">Excel (XLSX)</SelectItem>
                <SelectItem value="csv">CSV</SelectItem>
                <SelectItem value="json">JSON</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <div className="pt-2">
          <Button 
            onClick={handleExport} 
            className="bg-massage-500 hover:bg-massage-600"
            disabled={isExporting}
          >
            <Download className="w-4 h-4 mr-2" />
            {isExporting ? "Exportando..." : "Exportar Dados"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
