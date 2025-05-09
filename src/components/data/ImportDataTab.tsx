import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { FileUploadSection } from './FileUploadSection';
import { FieldMappingSection } from './FieldMappingSection';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { GoogleAuthGuide } from "./GoogleAuthGuide";
import * as XLSX from "xlsx";
import { sanitizeDataForSupabase } from "@/lib/supabase-utils";
import { BulkDeleteButton } from "./BulkDeleteButton";
import { asDbTable, DatabaseTablesType } from "@/lib/database-types";

interface ImportDataTabProps {
  tables: Array<{
    id: string;
    name: string;
  }>;
}

// Helper function to convert Excel dates
const excelDateToJsDate = (excelDate: number) => {
  const millisecondsPerDay = 24 * 60 * 60 * 1000;
  const excelEpoch = new Date(1900, 0, 1);
  const daysAdjustedForExcelBug = excelDate > 60 ? excelDate - 1 : excelDate;
  const utcDays = daysAdjustedForExcelBug - 1;
  const jsDate = new Date(excelEpoch.getTime() + utcDays * millisecondsPerDay);
  return jsDate;
};

// Helper function to format date as YYYY-MM-DD
const formatDateYYYYMMDD = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export function ImportDataTab({ tables }: ImportDataTabProps) {
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [sheetData, setSheetData] = useState<any[] | null>(null);
  const [tableColumns, setTableColumns] = useState<string[]>([]);
  const [mappings, setMappings] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [importSuccess, setImportSuccess] = useState<boolean | null>(null);
  const [importStats, setImportStats] = useState({ total: 0, success: 0, errors: 0 });
  const [activeTab, setActiveTab] = useState<string>("upload");
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [errorMessages, setErrorMessages] = useState<string[]>([]);
  
  useEffect(() => {
    if (selectedTable) {
      fetchTableColumns(selectedTable);
      setMappings({});
      setSheetData(null);
      setFile(null);
      setPreviewData([]);
      setImportSuccess(null);
      setErrorMessages([]);
    }
  }, [selectedTable]);
  
  const fetchTableColumns = async (tableName: string) => {
    try {
      const { data, error } = await supabase.rpc('get_table_columns', { table_name: tableName });
      if (error) throw error;
      setTableColumns(data || []);
    } catch (error) {
      toast.error("Erro ao carregar colunas da tabela");
    }
  };
  
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    setFile(selectedFile || null);
    
    if (!selectedFile) {
      setSheetData(null);
      setPreviewData([]);
      return;
    }
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        if (!data) throw new Error("Falha ao ler arquivo");
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        if (jsonData.length < 2) {
          toast.error("O arquivo não contém dados suficientes");
          return;
        }
        const headers = jsonData[0] as string[];
        const dataRows = jsonData.slice(1).map((row: any) => {
          const obj: Record<string, any> = {};
          headers.forEach((header, index) => {
            const headerStr = String(header).trim();
            if (headerStr) {
              obj[headerStr] = row[index];
            }
          });
          return obj;
        });
        setSheetData(dataRows);
        setPreviewData(dataRows.slice(0, 5));

        // -- AQUI ESTÁ O AJUSTE CRÍTICO: headers -> dbColumn!!
        if (selectedTable && tableColumns.length > 0) {
          const initialMapping: Record<string, string> = {};
          headers.forEach((sheetCol) => {
            // Tenta achar coluna correspondente na tabela
            const matchingDbColumn = tableColumns.find(
              dbCol => dbCol.toLowerCase() === String(sheetCol).toLowerCase()
            );
            if (matchingDbColumn) {
              // Chave = header do CSV, valor = coluna do banco
              initialMapping[String(sheetCol)] = matchingDbColumn;
            }
          });
          setMappings(initialMapping);
        }
        setActiveTab("mapping");
      } catch (error) {
        toast.error("Erro ao processar o arquivo");
      }
    };
    reader.readAsArrayBuffer(selectedFile);
  };
  
  // Mantém o padrão: chave é o campo do CSV, valor é a coluna do banco
  const handleMappingChange = (csvField: string, dbField: string) => {
    setMappings(prev => ({
      ...prev,
      [csvField]: dbField
    }));
  };
  
  const handleImport = async () => {
    if (!sheetData || !selectedTable || Object.keys(mappings).length === 0) {
      toast.error("Configuração de importação incompleta");
      return;
    }
    setIsLoading(true);
    setErrorMessages([]);
    try {
      let successCount = 0;
      let errorCount = 0;
      const errors: string[] = [];
      const batchSize = 50;
      const batches = [];
      for (let i = 0; i < sheetData.length; i += batchSize) {
        batches.push(sheetData.slice(i, i + batchSize));
      }
      for (const batch of batches) {
        const recordsToInsert = batch.map((row) => {
          const record: Record<string, any> = {};
          // NOVO: percorre mappings csv->db
          Object.entries(mappings).forEach(([csvField, dbField]) => {
            if (dbField) {
              if (dbField.includes('date') && row[csvField] !== undefined) {
                if (typeof row[csvField] === 'number') {
                  const jsDate = excelDateToJsDate(row[csvField]);
                  record[dbField] = formatDateYYYYMMDD(jsDate);
                } else if (typeof row[csvField] === 'string') {
                  const parsedDate = new Date(row[csvField]);
                  if (!isNaN(parsedDate.getTime())) {
                    record[dbField] = formatDateYYYYMMDD(parsedDate);
                  } else {
                    record[dbField] = row[csvField];
                  }
                }
              } else {
                record[dbField] = row[csvField];
              }
            }
          });
          return record;
        });
        const sanitizedRecords = sanitizeDataForSupabase
          ? sanitizeDataForSupabase(recordsToInsert)
          : recordsToInsert;
        const { error } = await supabase
          .from(asDbTable(selectedTable))
          .insert(sanitizedRecords);
        if (error) {
          errorCount += recordsToInsert.length;
          errors.push(`Erro ao inserir lote: ${error.message}`);
        } else {
          successCount += recordsToInsert.length;
        }
      }
      setImportStats({
        total: sheetData.length,
        success: successCount,
        errors: errorCount
      });
      setImportSuccess(errorCount === 0);
      setErrorMessages(errors);
      if (errorCount === 0) {
        toast.success(`Importação concluída com sucesso! ${successCount} registros importados.`);
      } else {
        toast.warning(`Importação concluída com alertas. ${successCount} registros importados, ${errorCount} falhas.`);
      }
      setActiveTab("review");
    } catch (error: any) {
      setImportSuccess(false);
      setErrorMessages([`Erro na importação: ${error.message || 'Erro desconhecido'}`]);
      toast.error("Erro ao importar dados");
    } finally {
      setIsLoading(false);
    }
  };
  
  const resetImport = () => {
    setSelectedTable(null);
    setFile(null);
    setSheetData(null);
    setMappings({});
    setPreviewData([]);
    setImportSuccess(null);
    setErrorMessages([]);
    setActiveTab("upload");
  };
  
  const hasTableOptions = tables && tables.length > 0;
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex justify-between">
          <span>Importar Dados</span>
          {selectedTable && (
            <Badge variant="outline" className="ml-2">
              {tables.find(t => t.id === selectedTable)?.name}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!hasTableOptions ? (
          <Alert className="mb-4">
            <AlertDescription>
              Nenhuma tabela disponível para importação.
            </AlertDescription>
          </Alert>
        ) : (
          <>
            {!selectedTable ? (
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Selecione o tipo de dados para importar:</h3>
                <RadioGroup 
                  value={selectedTable || ""}
                  onValueChange={(value) => setSelectedTable(value)}
                  className="grid grid-cols-1 md:grid-cols-2 gap-4"
                >
                  {tables.map((table) => (
                    <div key={table.id} className="flex items-start space-x-2 rounded-md border p-4">
                      <RadioGroupItem value={table.id} id={`table-${table.id}`} />
                      <Label
                        htmlFor={`table-${table.id}`}
                        className="flex flex-col"
                      >
                        <span className="font-medium">{table.name}</span>
                        <span className="text-sm text-muted-foreground">{table.id}</span>
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>
            ) : (
              <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
                <TabsList className="grid grid-cols-3 mb-4">
                  <TabsTrigger value="upload" disabled={isLoading}>
                    1. Carregar Arquivo
                  </TabsTrigger>
                  <TabsTrigger 
                    value="mapping" 
                    disabled={!file || isLoading}
                  >
                    2. Mapear Campos
                  </TabsTrigger>
                  <TabsTrigger 
                    value="review" 
                    disabled={!importSuccess && importSuccess !== false}
                  >
                    3. Revisar
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="upload" className="space-y-4">
                  <FileUploadSection
                    onFileUpload={handleFileUpload}
                  />
                  
                  <div className="flex justify-between mt-6">
                    <Button 
                      variant="outline" 
                      onClick={() => setSelectedTable(null)}
                    >
                      Voltar
                    </Button>
                    <Button
                      disabled={!file}
                      onClick={() => setActiveTab("mapping")}
                    >
                      Avançar
                    </Button>
                  </div>
                </TabsContent>
                
                <TabsContent value="mapping" className="space-y-4">
                  {sheetData && sheetData.length > 0 ? (
                    <>
                      <div className="space-y-8">
                        <div>
                          <h3 className="text-lg font-medium mb-4">Mapeamento de Campos</h3>
                          <FieldMappingSection
                            csvHeaders={Object.keys(sheetData[0])}
                            tableColumns={tableColumns}
                            mappings={mappings}
                            onMappingChange={handleMappingChange}
                            onTableChange={setSelectedTable}
                            selectedTable={selectedTable}
                            tables={tables}
                          />
                        </div>
                        
                        <div>
                          <h3 className="text-lg font-medium mb-4">Pré-visualização dos Dados</h3>
                          <div className="border rounded overflow-x-auto">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  {Object.keys(sheetData[0]).map((header, index) => (
                                    <TableHead key={index}>
                                      {header}
                                      {Object.entries(mappings).find(([csvCol, _]) => csvCol === header) && (
                                        <Badge variant="outline" className="ml-2">
                                          Mapeado
                                        </Badge>
                                      )}
                                    </TableHead>
                                  ))}
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {previewData.map((row, rowIndex) => (
                                  <TableRow key={rowIndex}>
                                    {Object.keys(sheetData[0]).map((header, cellIndex) => (
                                      <TableCell key={cellIndex}>
                                        {row[header] !== undefined ? String(row[header]) : ""}
                                      </TableCell>
                                    ))}
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                          <div className="text-sm text-muted-foreground mt-2">
                            Mostrando {previewData.length} de {sheetData.length} registros
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex justify-between mt-6">
                        <Button 
                          variant="outline" 
                          onClick={() => setActiveTab("upload")}
                          disabled={isLoading}
                        >
                          Voltar
                        </Button>
                        <Button
                          onClick={handleImport}
                          disabled={
                            isLoading || 
                            Object.keys(mappings).length === 0
                          }
                          className="bg-massage-500 hover:bg-massage-600"
                        >
                          {isLoading ? "Importando..." : "Importar Dados"}
                        </Button>
                      </div>
                    </>
                  ) : (
                    <Alert>
                      <AlertDescription>
                        Não há dados para mapear. Por favor, carregue um arquivo válido.
                      </AlertDescription>
                    </Alert>
                  )}
                </TabsContent>
                
                <TabsContent value="review" className="space-y-4">
                  <div>
                    <h3 className="text-lg font-medium mb-4">Resultado da Importação</h3>
                    <div className="grid gap-4 md:grid-cols-3">
                      <Card>
                        <CardContent className="pt-6">
                          <div className="text-center">
                            <div className="text-2xl font-bold">{importStats.total}</div>
                            <div className="text-sm text-muted-foreground">Total de Registros</div>
                          </div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="pt-6">
                          <div className="text-center">
                            <div className="text-2xl font-bold text-green-600">{importStats.success}</div>
                            <div className="text-sm text-muted-foreground">Registros Importados</div>
                          </div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="pt-6">
                          <div className="text-center">
                            <div className="text-2xl font-bold text-red-600">{importStats.errors}</div>
                            <div className="text-sm text-muted-foreground">Erros</div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                  
                  {errorMessages.length > 0 && (
                    <Alert className="bg-red-50 text-red-800 border-red-300">
                      <div className="space-y-2">
                        <h4 className="font-semibold">Erros encontrados:</h4>
                        <ul className="list-disc pl-6 space-y-1">
                          {errorMessages.slice(0, 5).map((error, index) => (
                            <li key={index}>{error}</li>
                          ))}
                          {errorMessages.length > 5 && (
                            <li>...e mais {errorMessages.length - 5} erros não exibidos</li>
                          )}
                        </ul>
                      </div>
                    </Alert>
                  )}
                  
                  <div className="flex justify-end mt-6">
                    <Button
                      onClick={resetImport}
                      className="bg-massage-500 hover:bg-massage-600"
                    >
                      Nova Importação
                    </Button>
                  </div>
                </TabsContent>
              </Tabs>
            )}
          </>
        )}
        
        <GoogleAuthGuide />
        
        {selectedTable && (
          <div className="mt-8 pt-6 border-t">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium">Limpar Dados</h3>
              <BulkDeleteButton tableName={selectedTable as DatabaseTablesType} />
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              Cuidado: esta ação excluirá todos os registros da tabela selecionada.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}