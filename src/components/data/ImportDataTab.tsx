
import { useState } from "react";
import { FileUploadSection } from "./FileUploadSection";
import { FieldMappingSection } from "./FieldMappingSection";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import * as XLSX from "xlsx";

export function ImportDataTab() {
  const [step, setStep] = useState<1 | 2>(1);
  const [fileData, setFileData] = useState<any[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [targetTable, setTargetTable] = useState<string | null>(null);
  const [fieldMappings, setFieldMappings] = useState<Record<string, string>>({});
  const [tableColumns, setTableColumns] = useState<string[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  
  const handleFileData = (data: any[], fileName: string) => {
    if (!data || data.length === 0) {
      toast.error("Arquivo vazio ou inválido");
      return;
    }
    
    setFileData(data);
    
    // Extract headers from the first row
    const extractedHeaders = Object.keys(data[0]);
    setHeaders(extractedHeaders);
    
    // Try to guess target table from filename
    const possibleTables = ["customers", "professionals", "services", "appointments"];
    const tableGuess = possibleTables.find(table => 
      fileName.toLowerCase().includes(table) || 
      fileName.toLowerCase().includes(table.slice(0, -1))
    );
    
    if (tableGuess) {
      setTargetTable(tableGuess);
      fetchTableColumns(tableGuess);
    }
    
    // Proceed to field mapping
    setStep(2);
  };
  
  const fetchTableColumns = async (tableName: string) => {
    try {
      const { data, error } = await supabase.rpc('get_table_columns', {
        table_name: tableName
      });
      
      if (error) throw error;
      setTableColumns(data || []);
    } catch (error) {
      console.error('Error fetching table columns:', error);
      toast.error('Erro ao carregar colunas da tabela');
    }
  };
  
  const handleTableChange = (table: string) => {
    setTargetTable(table);
    fetchTableColumns(table);
    // Reset field mappings when table changes
    setFieldMappings({});
  };
  
  const handleMappingChange = (csvField: string, dbField: string) => {
    setFieldMappings(prev => ({
      ...prev,
      [csvField]: dbField
    }));
  };
  
  const handleImport = async () => {
    if (!targetTable || !fileData.length) {
      toast.error("Selecione uma tabela e carregue dados para importar");
      return;
    }
    
    setIsImporting(true);
    
    try {
      // Transform data based on field mappings
      const transformedData = fileData.map(row => {
        const newRow: Record<string, any> = {};
        
        Object.entries(fieldMappings).forEach(([csvField, dbField]) => {
          if (dbField && row[csvField] !== undefined) {
            newRow[dbField] = row[csvField];
          }
        });
        
        return newRow;
      });
      
      // Handle empty rows
      const nonEmptyRows = transformedData.filter(row => Object.keys(row).length > 0);
      
      if (nonEmptyRows.length === 0) {
        toast.warning("Não há dados válidos para importar após o mapeamento");
        setIsImporting(false);
        return;
      }
      
      // Insert data in batches to avoid payload size limits
      const BATCH_SIZE = 50;
      const batches = [];
      
      for (let i = 0; i < nonEmptyRows.length; i += BATCH_SIZE) {
        batches.push(nonEmptyRows.slice(i, i + BATCH_SIZE));
      }
      
      let successCount = 0;
      let errorCount = 0;
      
      for (const batch of batches) {
        const { data, error } = await supabase
          .from(targetTable)
          .insert(batch)
          .select();
        
        if (error) {
          console.error('Batch import error:', error);
          errorCount += batch.length;
        } else {
          successCount += (data?.length || 0);
        }
      }
      
      if (errorCount > 0) {
        toast.warning(`Importação concluída com ${successCount} registros importados e ${errorCount} erros`);
      } else {
        toast.success(`${successCount} registros importados com sucesso`);
      }
      
      // Reset the import form
      setStep(1);
      setFileData([]);
      setHeaders([]);
      setFieldMappings({});
    } catch (error) {
      console.error('Import error:', error);
      toast.error('Erro ao importar dados');
    } finally {
      setIsImporting(false);
    }
  };
  
  const handleRestart = () => {
    setStep(1);
    setFileData([]);
    setHeaders([]);
    setFieldMappings({});
  };
  
  return (
    <div className="space-y-6">
      {step === 1 ? (
        <FileUploadSection onFileData={handleFileData} />
      ) : (
        <>
          <FieldMappingSection 
            csvHeaders={headers}
            tableColumns={tableColumns}
            mappings={fieldMappings}
            onMappingChange={handleMappingChange}
            onTableChange={handleTableChange}
            selectedTable={targetTable}
          />
          
          <div className="flex justify-between mt-6">
            <Button variant="outline" onClick={handleRestart}>
              Voltar
            </Button>
            
            <Button 
              onClick={handleImport} 
              disabled={isImporting || !targetTable || Object.keys(fieldMappings).length === 0}
            >
              {isImporting ? "Importando..." : "Importar Dados"}
            </Button>
          </div>
          
          {Object.keys(fieldMappings).length > 0 && (
            <div className="mt-6 p-4 bg-accent rounded-md">
              <h3 className="text-sm font-medium mb-2">Prévia de Dados (primeiros 5 registros)</h3>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr>
                      {Object.entries(fieldMappings).map(([csvField, dbField]) => (
                        dbField && <th key={csvField} className="p-2 text-left border-b">{dbField}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {fileData.slice(0, 5).map((row, idx) => (
                      <tr key={idx}>
                        {Object.entries(fieldMappings).map(([csvField, dbField]) => (
                          dbField && <td key={`${idx}-${csvField}`} className="p-2 border-b">{row[csvField]}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
