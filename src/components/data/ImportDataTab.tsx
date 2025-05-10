
import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { FileUploadSection } from './FileUploadSection';
import { FieldMappingSection } from './FieldMappingSection';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, FileUp, Loader2 } from 'lucide-react';
import { parseAndFormatDate } from '@/lib/xlsx-utils';
import { DatabaseTablesType, asDbTable } from '@/lib/database-types';

interface TableOption {
  id: string;
  name: string;
}

interface ImportDataTabProps {
  tables: TableOption[];
}

const ImportDataTab: React.FC<ImportDataTabProps> = ({ tables }) => {
  const [selectedTable, setSelectedTable] = useState<string>('');
  const [tableColumns, setTableColumns] = useState<string[]>([]);
  const [sheetData, setSheetData] = useState<any[]>([]);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [mappings, setMappings] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState<'upload' | 'mapping'>('upload');
  const [loading, setLoading] = useState<boolean>(false);
  const [importProgress, setImportProgress] = useState<number>(0);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [importResult, setImportResult] = useState<{
    success: number;
    failed: number;
    errors: string[];
  } | null>(null);

  // Fetch table columns from Supabase when a table is selected
  const fetchTableColumns = async (tableName: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase.rpc('get_table_columns', { table_name: tableName });
      
      if (error) throw error;

      // Make sure all columns are strings
      let columns: string[] = [];
      if (Array.isArray(data)) {
        columns = data.map(col => {
          // Handle both object format and simple array format
          if (typeof col === 'object' && col !== null && 'column_name' in col) {
            return String(col.column_name);
          } else {
            return String(col);
          }
        });
      }
      
      setTableColumns(columns);
    } catch (error: any) {
      console.error("Error fetching columns:", error);
      toast.error(`Erro ao carregar colunas: ${error.message || String(error)}`);
      setTableColumns([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedTable) {
      fetchTableColumns(selectedTable);
      setSheetData([]);
      setPreviewData([]);
      setCsvHeaders([]);
      setMappings({});
      setActiveTab('upload');
    }
  }, [selectedTable]);

  // Handle file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        setLoading(true);
        const data = evt.target?.result;
        if (!data) throw new Error("Falha ao ler arquivo");
        
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" });

        if (jsonData.length < 2) {
          toast.error("O arquivo não contém dados suficientes");
          setLoading(false);
          return;
        }
        
        // Extract headers (first row)
        const headers = jsonData[0];
        if (!Array.isArray(headers) || !headers.length) {
          toast.error("Arquivo sem cabeçalhos válidos.");
          setLoading(false);
          return;
        }

        // Ensure all headers are strings
        const normalizedHeaders: string[] = headers.map(header => 
          header !== null && header !== undefined ? String(header) : ""
        ).filter(header => header !== "");

        console.log("Normalized headers:", normalizedHeaders);
        setCsvHeaders(normalizedHeaders);

        // Process file data (skip header row)
        const dataRows = jsonData.slice(1).map((row: any[]) => {
          const obj: Record<string, any> = {};
          normalizedHeaders.forEach((header, idx) => {
            if (header) obj[header] = row[idx];
          });
          return obj;
        });
        
        setSheetData(dataRows);
        setPreviewData(dataRows.slice(0, 5));
        setActiveTab('mapping');
        toast.success(`Arquivo carregado com ${dataRows.length} registros`);
      } catch (error: any) {
        console.error("Erro ao processar arquivo:", error);
        toast.error(`Erro ao processar o arquivo: ${error.message || String(error)}`);
      } finally {
        setLoading(false);
      }
    };

    reader.readAsArrayBuffer(file);
  };

  const handleMappingChange = (csvField: string, dbField: string) => {
    setMappings(prev => ({
      ...prev,
      [csvField]: dbField
    }));
  };

  // Convert Excel data types to appropriate DB types
  const prepareDataForImport = (data: any[]): any[] => {
    return data.map(item => {
      const preparedItem: Record<string, any> = {};
      
      Object.keys(mappings).forEach(csvField => {
        const dbField = mappings[csvField];
        if (!dbField) return; // Skip unmapped fields
        
        const value = item[csvField];
        if (value === undefined || value === null) return;
        
        // Handle date fields - detect by column name
        if (dbField.toLowerCase().includes('date')) {
          preparedItem[dbField] = parseAndFormatDate(value);
        } 
        // Handle boolean fields
        else if (typeof value === 'string' && ['true', 'false', 'sim', 'não', 'yes', 'no'].includes(value.toLowerCase())) {
          const isTrue = ['true', 'sim', 'yes'].includes(value.toLowerCase());
          preparedItem[dbField] = isTrue;
        }
        // Handle numeric fields
        else if (!isNaN(Number(value)) && dbField.toLowerCase().includes('price') || 
                 dbField.toLowerCase().includes('percentage') || 
                 dbField.toLowerCase().includes('amount')) {
          preparedItem[dbField] = Number(value);
        } 
        // Default: keep as is (usually string)
        else {
          preparedItem[dbField] = value;
        }
      });
      
      return preparedItem;
    });
  };

  // Function for data import
  const handleImport = async () => {
    if (!selectedTable || !sheetData.length || Object.keys(mappings).length === 0) {
      toast.error("Configuração incompleta para importação");
      return;
    }

    const hasMappings = Object.values(mappings).some(value => value);
    if (!hasMappings) {
      toast.error("Você precisa mapear pelo menos um campo");
      return;
    }

    setLoading(true);
    setImportResult(null);
    setImportProgress(0);
    
    try {
      const preparedData = prepareDataForImport(sheetData);
      console.log("Prepared data:", preparedData);
      
      let successCount = 0;
      let failedCount = 0;
      const errors: string[] = [];
      
      // Process in batches of 100 items
      const batchSize = 100;
      const totalBatches = Math.ceil(preparedData.length / batchSize);
      
      for (let i = 0; i < preparedData.length; i += batchSize) {
        const batch = preparedData.slice(i, i + batchSize);
        
        // Insert data into Supabase
        const { data, error } = await supabase
          .from(asDbTable(selectedTable))
          .insert(batch);
        
        if (error) {
          console.error("Error inserting batch:", error);
          failedCount += batch.length;
          errors.push(`Erro no lote ${i/batchSize + 1}: ${error.message}`);
        } else {
          successCount += batch.length;
        }
        
        // Update progress
        const completedBatches = Math.floor(i / batchSize) + 1;
        setImportProgress(Math.floor((completedBatches / totalBatches) * 100));
      }
      
      setImportResult({
        success: successCount,
        failed: failedCount,
        errors: errors
      });
      
      if (failedCount === 0) {
        toast.success(`Importação concluída! ${successCount} registros importados.`);
      } else {
        toast.warning(`Importação parcial: ${successCount} registros importados, ${failedCount} falhas.`);
      }
    } catch (error: any) {
      console.error("Import error:", error);
      toast.error(`Erro durante importação: ${error.message || String(error)}`);
      setImportResult({
        success: 0,
        failed: sheetData.length,
        errors: [error.message || String(error)]
      });
    } finally {
      setLoading(false);
      setImportProgress(100);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-4">
        {activeTab === 'upload' ? (
          <Card>
            <CardContent className="pt-6">
              <FileUploadSection 
                importFormat="xlsx" 
                isImporting={loading}
                onFileUpload={handleFileUpload}
                fileData={sheetData.length > 0 ? sheetData : null}
              />

              <div className="mt-4 space-y-4">
                <FieldMappingSection
                  csvHeaders={csvHeaders}
                  tableColumns={tableColumns}
                  mappings={mappings}
                  onMappingChange={handleMappingChange}
                  onTableChange={setSelectedTable}
                  selectedTable={selectedTable}
                  tables={tables}
                />
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            <Card>
              <CardContent className="pt-6">
                <h3 className="text-lg font-medium mb-4">Prévia dos dados</h3>
                <div className="overflow-x-auto">
                  <table className="w-full table-fixed border-collapse">
                    <thead>
                      <tr className="border-b">
                        {Object.keys(mappings)
                          .filter(key => mappings[key])
                          .map(header => (
                            <th key={header} className="px-4 py-2 text-left text-sm">
                              {header} → {mappings[header]}
                            </th>
                          ))}
                      </tr>
                    </thead>
                    <tbody>
                      {previewData.map((row, idx) => (
                        <tr key={idx} className="border-b">
                          {Object.keys(mappings)
                            .filter(key => mappings[key])
                            .map(header => (
                              <td key={header} className="px-4 py-2 text-sm truncate">
                                {row[header] !== undefined ? String(row[header]) : "-"}
                              </td>
                            ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
            
            {importResult && (
              <Alert variant={importResult.failed > 0 ? "destructive" : "default"}>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <p>Resultado da importação:</p>
                  <ul className="list-disc pl-5 mt-2">
                    <li>Registros importados: {importResult.success}</li>
                    <li>Registros com falha: {importResult.failed}</li>
                  </ul>
                  {importResult.errors.length > 0 && (
                    <details className="mt-2">
                      <summary className="cursor-pointer">Mostrar erros</summary>
                      <ul className="list-disc pl-5 mt-2 text-sm">
                        {importResult.errors.map((error, idx) => (
                          <li key={idx}>{error}</li>
                        ))}
                      </ul>
                    </details>
                  )}
                </AlertDescription>
              </Alert>
            )}

            <div className="flex justify-between items-center">
              <Button 
                onClick={() => setActiveTab('upload')} 
                variant="outline"
                disabled={loading}
              >
                Voltar para seleção
              </Button>
              
              <Button 
                onClick={handleImport} 
                disabled={loading || Object.keys(mappings).length === 0}
                className="bg-massage-500 hover:bg-massage-600"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Importando...
                  </>
                ) : (
                  <>
                    <FileUp className="mr-2 h-4 w-4" />
                    Importar Dados
                  </>
                )}
              </Button>
            </div>
            
            {loading && (
              <div className="space-y-2">
                <Progress value={importProgress} className="w-full" />
                <p className="text-xs text-center">{importProgress}% completo</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ImportDataTab;
