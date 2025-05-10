import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { FileUploadSection } from './FileUploadSection';
import { FieldMappingSection } from './FieldMappingSection';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, FileUp, Loader2 } from 'lucide-react';
import { parseAndFormatDate, excelToJson } from '@/lib/xlsx-utils';
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
  const [fileUploaded, setFileUploaded] = useState<boolean>(false);

  // Fetch table columns from Supabase when a table is selected
  const fetchTableColumns = async (tableName: string) => {
    try {
      setLoading(true);
      console.log(`Fetching columns for table: ${tableName}`);
      
      const { data, error } = await supabase.rpc('get_table_columns', { 
        table_name: tableName 
      });
      
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
      
      console.log(`Retrieved ${columns.length} columns for table ${tableName}:`, columns);
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
      console.log("Selected table changed to:", selectedTable);
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
        
        const jsonData = excelToJson(data as ArrayBuffer);

        if (!jsonData || jsonData.length < 1) {
          toast.error("O arquivo não contém dados suficientes");
          setLoading(false);
          return;
        }
        
        // Extract headers from first object's keys
        const headers = Object.keys(jsonData[0] || {});
        if (!headers.length) {
          toast.error("Arquivo sem cabeçalhos válidos.");
          setLoading(false);
          return;
        }

        console.log("File headers:", headers);
        setCsvHeaders(headers);
        setSheetData(jsonData);
        setPreviewData(jsonData.slice(0, 5));
        setActiveTab('mapping');
        setFileUploaded(true);
        toast.success(`Arquivo carregado com ${jsonData.length} registros`);
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

  // Find entity ID by name with improved search - critical fix for customer import
  const findEntityIdByName = async (tableName: string, nameField: string, nameValue: string) => {
    if (!nameValue) return null;
    
    try {
      console.log(`Finding entity ID in table ${tableName} for name "${nameValue}"`);
      
      // Enhanced search logic based on table type
      if (tableName === 'customers') {
        // Split name into parts and search for first name or last name matches
        const nameParts = nameValue.trim().split(/\s+/);
        
        if (nameParts.length === 0) return null;
        
        // Try different search strategies
        const strategies = [
          // Strategy 1: If name has multiple parts, assume first part is first name and rest is last name
          async () => {
            if (nameParts.length > 1) {
              const firstName = nameParts[0];
              const lastName = nameParts.slice(1).join(' ');
              
              console.log(`Strategy 1: Trying with first_name='${firstName}' and last_name='${lastName}'`);
              
              const { data, error } = await supabase
                .from('customers')
                .select('id')
                .eq('first_name', firstName)
                .eq('last_name', lastName)
                .limit(1);
                
              if (error) {
                console.error("Error in search strategy 1:", error);
                return null;
              }
              
              if (data && data.length > 0) {
                console.log(`Found customer with exact name match: ${data[0].id}`);
                return data[0].id;
              }
              return null;
            }
            return null;
          },
          
          // Strategy 2: Search for first name like any part of the provided name
          async () => {
            console.log(`Strategy 2: Trying with first_name LIKE any part of "${nameValue}"`);
            
            const { data, error } = await supabase
              .from('customers')
              .select('id, first_name, last_name')
              .ilike('first_name', `%${nameValue}%`)
              .limit(5);
              
            if (error) {
              console.error("Error in search strategy 2:", error);
              return null;
            }
            
            // If we get results, use the best match
            if (data && data.length > 0) {
              console.log(`Found ${data.length} customers with first name containing "${nameValue}"`, data);
              // Use first result for simplicity
              return data[0].id;
            }
            return null;
          },
          
          // Strategy 3: Search for last name like any part of the provided name
          async () => {
            console.log(`Strategy 3: Trying with last_name LIKE any part of "${nameValue}"`);
            
            const { data, error } = await supabase
              .from('customers')
              .select('id, first_name, last_name')
              .ilike('last_name', `%${nameValue}%`)
              .limit(5);
              
            if (error) {
              console.error("Error in search strategy 3:", error);
              return null;
            }
            
            if (data && data.length > 0) {
              console.log(`Found ${data.length} customers with last name containing "${nameValue}"`, data);
              return data[0].id;
            }
            return null;
          },
          
          // Strategy 4: Get all customers and do manual string comparison to find best match
          async () => {
            console.log(`Strategy 4: Trying full text search on all customers`);
            
            const { data, error } = await supabase
              .from('customers')
              .select('id, first_name, last_name')
              .limit(100);
              
            if (error) {
              console.error("Error fetching all customers:", error);
              return null;
            }
            
            if (data && data.length > 0) {
              // Find the customer with name most similar to the input
              const matchedCustomer = data.find(customer => {
                const fullName = `${customer.first_name} ${customer.last_name}`.toLowerCase();
                return fullName.includes(nameValue.toLowerCase());
              });
              
              if (matchedCustomer) {
                console.log(`Found matching customer via text search: ${matchedCustomer.id} - ${matchedCustomer.first_name} ${matchedCustomer.last_name}`);
                return matchedCustomer.id;
              }
            }
            return null;
          }
        ];
        
        // Try each strategy in sequence until one succeeds
        for (const strategy of strategies) {
          const result = await strategy();
          if (result) return result;
        }
        
        console.warn(`No customer found with name matching "${nameValue}" after trying all strategies`);
        return null;
      } else if (tableName === 'professionals' || tableName === 'services' || tableName === 'payment_methods') {
        // For other entities, use simple name search with ILIKE
        const { data, error } = await supabase
          .from(asDbTable(tableName))
          .select('id')
          .ilike('name', `%${nameValue}%`)
          .limit(1);
          
        if (error) {
          console.error(`Error finding ${tableName} by name:`, error);
          return null;
        }
        
        if (data && data.length > 0) {
          console.log(`Found entity in ${tableName}:`, data[0]);
          return data[0].id;
        }
      }
      
      console.warn(`No entity found in ${tableName} for name: ${nameValue}`);
      return null;
    } catch (error) {
      console.error(`Error in findEntityIdByName for ${tableName}:`, error);
      return null;
    }
  };

  // Clean numeric values - Enhanced to handle "60 minutos" type strings
  const cleanNumericValue = (value: any): number | null => {
    if (value === null || value === undefined || value === '') return null;
    
    if (typeof value === 'number') return value;
    
    if (typeof value === 'string') {
      // Remove any non-numeric characters except for decimal point
      // Also handle cases like "60 minutos" by extracting just the number
      const numericPart = value.match(/(\d+([,.]\d+)?)/);
      if (numericPart && numericPart[0]) {
        // Replace comma with dot for decimal parsing
        const cleanedValue = numericPart[0].replace(',', '.');
        const parsedValue = parseFloat(cleanedValue);
        return isNaN(parsedValue) ? null : parsedValue;
      }
    }
    
    return null;
  };

  // Format time values from various formats to HH:MM:SS
  const formatTimeValue = (value: any): string => {
    if (!value) {
      // CRITICAL FIX: Return default time instead of null to prevent not-null constraint violation
      return '00:00:00';
    }
    
    // If already in time format HH:MM:SS or HH:MM
    if (typeof value === 'string' && /^\d{1,2}:\d{2}(:\d{2})?$/.test(value)) {
      // Ensure it has seconds if not present
      if (!value.includes(':', value.indexOf(':') + 1)) {
        return value + ':00';
      }
      return value;
    }
    
    // Handle Excel time values (decimal fraction of day)
    if (typeof value === 'number') {
      const totalSeconds = Math.round(value * 24 * 60 * 60);
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;
      
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    
    // Try to extract time from string like "10:30 AM" or other formats
    try {
      const date = new Date(`2000-01-01T${value}`);
      if (!isNaN(date.getTime())) {
        return date.toTimeString().split(' ')[0];
      }
    } catch (error) {
      console.log(`Could not parse time from: ${value}`);
    }
    
    // Default fallback - return default time instead of null
    return '00:00:00';
  };

  // Convert Excel data types to appropriate DB types
  const prepareDataForImport = async (data: any[]): Promise<any[]> => {
    const preparedItems: any[] = [];
    
    for (const item of data) {
      const preparedItem: Record<string, any> = {};
      
      for (const csvField in mappings) {
        const dbField = mappings[csvField];
        if (!dbField) continue; // Skip unmapped fields
        
        const value = item[csvField];
        
        // Handle foreign key references based on field names
        if (selectedTable === 'appointments') {
          // Convert entity names to UUIDs
          if (dbField === 'customer_id' && typeof value === 'string') {
            const customerId = await findEntityIdByName('customers', 'name', value);
            if (customerId) {
              preparedItem[dbField] = customerId;
              console.log(`Mapped customer name "${value}" to ID: ${customerId}`);
            } else {
              console.warn(`Could not find customer with name: ${value}`);
              // Don't add the item if required customer ID is missing
              continue;
            }
          }
          else if (dbField === 'primary_professional_id' && typeof value === 'string') {
            const professionalId = await findEntityIdByName('professionals', 'name', value);
            if (professionalId) {
              preparedItem[dbField] = professionalId;
            } else {
              console.warn(`Could not find professional with name: ${value}`);
              continue;
            }
          }
          else if (dbField === 'secondary_professional_id' && typeof value === 'string') {
            // Handle empty secondary professional
            if (!value.trim()) {
              preparedItem[dbField] = null;
            } else {
              const professionalId = await findEntityIdByName('professionals', 'name', value);
              preparedItem[dbField] = professionalId; // Can be null
            }
          }
          else if (dbField === 'service_id' && typeof value === 'string') {
            const serviceId = await findEntityIdByName('services', 'name', value);
            if (serviceId) {
              preparedItem[dbField] = serviceId;
            } else {
              console.warn(`Could not find service with name: ${value}`);
              continue;
            }
          }
          else if (dbField === 'payment_method_id' && typeof value === 'string') {
            const paymentMethodId = await findEntityIdByName('payment_methods', 'name', value);
            if (paymentMethodId) {
              preparedItem[dbField] = paymentMethodId;
            } else {
              console.warn(`Could not find payment method with name: ${value}`);
              continue;
            }
          }
          // Handle time field explicitly - CRITICAL FIX: Always ensure time is not null
          else if (dbField === 'time') {
            preparedItem[dbField] = formatTimeValue(value);
            console.log(`Formatted time value: ${value} -> ${preparedItem[dbField]}`);
          }
          // Handle date fields - detect by column name
          else if (dbField.toLowerCase().includes('date')) {
            preparedItem[dbField] = parseAndFormatDate(value);
          } 
          // Handle boolean fields
          else if (typeof value === 'string' && ['true', 'false', 'sim', 'não', 'yes', 'no'].includes(value.toLowerCase())) {
            const isTrue = ['true', 'sim', 'yes'].includes(value.toLowerCase());
            preparedItem[dbField] = isTrue;
          }
          // Handle numeric fields
          else if (
               dbField.toLowerCase().includes('price') 
            || dbField.toLowerCase().includes('percentage') 
            || dbField.toLowerCase().includes('amount')
            || dbField.toLowerCase().includes('duration')
          ) {
            preparedItem[dbField] = cleanNumericValue(value);
          } 
          // Default: keep as is (usually string)
          else {
            preparedItem[dbField] = value;
          }
        } else if (selectedTable === 'customers') {
          // Special handling for customer import
          preparedItem[dbField] = value;
        } else {
          // For other tables, use standard type conversion
          // Handle time fields
          if (dbField === 'time') {
            preparedItem[dbField] = formatTimeValue(value);
          }
          // Handle date fields
          else if (dbField.toLowerCase().includes('date')) {
            preparedItem[dbField] = parseAndFormatDate(value);
          } 
          // Handle boolean fields
          else if (typeof value === 'string' && ['true', 'false', 'sim', 'não', 'yes', 'no'].includes(value.toLowerCase())) {
            const isTrue = ['true', 'sim', 'yes'].includes(value.toLowerCase());
            preparedItem[dbField] = isTrue;
          }
          // Handle numeric fields
          else if (
               dbField.toLowerCase().includes('price') 
            || dbField.toLowerCase().includes('percentage') 
            || dbField.toLowerCase().includes('amount')
            || dbField.toLowerCase().includes('duration')
          ) {
            preparedItem[dbField] = cleanNumericValue(value);
          } 
          // Default: keep as is (usually string)
          else {
            preparedItem[dbField] = value;
          }
        }
      }
      
      // Special case for appointments table - ensure required fields are present
      if (selectedTable === 'appointments') {
        // Ensure time field is not null for appointments
        if (!preparedItem.time) {
          preparedItem.time = '00:00:00';
        }
      }
      
      // Only add items that have at least some fields mapped
      if (Object.keys(preparedItem).length > 0) {
        preparedItems.push(preparedItem);
      }
    }
    
    return preparedItems;
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
      const preparedData = await prepareDataForImport(sheetData);
      console.log("Prepared data:", preparedData);
      
      if (preparedData.length === 0) {
        toast.error("Nenhum dado válido para importar após conversão");
        setLoading(false);
        return;
      }
      
      let successCount = 0;
      let failedCount = 0;
      const errors: string[] = [];
      
      // Process in batches of 20 items
      const batchSize = 20;
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
          errors.push(`Erro no lote ${Math.floor(i/batchSize) + 1}: ${error.message}`);
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
                  fileUploaded={fileUploaded}
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
