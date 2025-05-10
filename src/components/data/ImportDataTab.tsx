
import React, { useState, useEffect, ChangeEvent } from "react";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FileUploadSection } from "./FileUploadSection";
import { FieldMappingSection } from "./FieldMappingSection";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Papa from "papaparse";
import { Edit, Eye, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { asDbTable } from "@/lib/database-types";

interface TableColumn {
  name: string;
  required: boolean;
  type: string;
}

interface ImportState {
  file: File | null;
  fileData: any[] | null;
  columns: string[];
  selectedTable: string;
  tableColumns: TableColumn[];
  mapping: { [key: string]: string };
  preview: any[];
}

export function ImportDataTab() {
  const navigate = useNavigate();
  const [importState, setImportState] = useState<ImportState>({
    file: null,
    fileData: null,
    columns: [],
    selectedTable: "",
    tableColumns: [],
    mapping: {},
    preview: [],
  });

  const [tables, setTables] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [columnsLoading, setColumnsLoading] = useState(false);
  const [autoMapDone, setAutoMapDone] = useState(false);
  const [importResult, setImportResult] = useState<any[]>([]);
  const [showResultDialog, setShowResultDialog] = useState(false);

  // Edit dialog states
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [currentEditIndex, setCurrentEditIndex] = useState<number | null>(null);
  const [editedItem, setEditedItem] = useState<any>(null);

  // View dialog states
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [currentViewItem, setCurrentViewItem] = useState<any>(null);

  // Fetch available tables
  useEffect(() => {
    const fetchTables = async () => {
      try {
        // Since get_table_existence doesn't exist in the function list, 
        // we'll directly set the supported tables
        setTables(["customers", "professionals", "services"]);
      } catch (error) {
        console.error("Error fetching tables:", error);
        toast.error("Erro ao buscar tabelas");
      }
    };

    fetchTables();
  }, []);

  // Handle file upload
  const handleFileUpload = async (file: File) => {
    try {
      setIsLoading(true);
      let fileData: any[] = [];
      let fileColumns: string[] = [];

      if (file.name.endsWith(".xlsx") || file.name.endsWith(".xls")) {
        // Handle Excel files
        const data = await readExcelFile(file);
        if (data && data.length > 0) {
          fileData = data;
          fileColumns = Object.keys(data[0]);
        }
      } else if (file.name.endsWith(".csv")) {
        // Handle CSV files
        const result = await new Promise<Papa.ParseResult<any>>(
          (resolve, reject) => {
            Papa.parse(file, {
              header: true,
              complete: resolve,
              error: reject,
            });
          }
        );
        fileData = result.data;
        fileColumns = result.meta.fields || [];
      } else {
        toast.error(
          "Formato de arquivo não suportado. Por favor, use .xlsx, .xls ou .csv"
        );
        return;
      }

      // Update state with file data
      setImportState((prev) => ({
        ...prev,
        file,
        fileData,
        columns: fileColumns,
        preview: fileData.slice(0, 5),
      }));

      toast.success("Arquivo carregado com sucesso");
    } catch (error) {
      console.error("Error uploading file:", error);
      toast.error("Erro ao processar o arquivo");
    } finally {
      setIsLoading(false);
    }
  };

  // Read Excel file
  const readExcelFile = (file: File): Promise<any[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          const workbook = XLSX.read(data, { type: "binary" });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const json = XLSX.utils.sheet_to_json(worksheet);
          resolve(json);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = (error) => reject(error);
      reader.readAsBinaryString(file);
    });
  };

  // Handle table selection
  const handleTableSelection = async (tableName: string) => {
    try {
      setColumnsLoading(true);
      const { data: columns, error } = await supabase.rpc("get_table_columns", {
        table_name: tableName,
      });

      if (error) {
        throw error;
      }

      // Define which columns are required based on table
      const getRequiredColumns = (tableName: string) => {
        switch (tableName) {
          case "customers":
            return ["first_name", "last_name"];
          case "professionals":
            return ["first_name", "last_name", "commission_percentage"];
          case "services":
            return ["name", "price", "duration"];
          default:
            return [];
        }
      };

      // Define column types based on table
      const getColumnType = (tableName: string, columnName: string) => {
        const numericTypes = [
          "price",
          "commission_percentage",
          "duration",
          "additional_fee_percentage",
        ];
        
        if (numericTypes.includes(columnName)) {
          return "numeric";
        }
        
        return "text";
      };

      const requiredColumns = getRequiredColumns(tableName);
      
      // Create table columns with required flags
      const tableColumns: TableColumn[] = columns.map((col: {column_name: string}) => ({
        name: col.column_name,
        required: requiredColumns.includes(col.column_name),
        type: getColumnType(tableName, col.column_name),
      }));

      setImportState((prev) => ({
        ...prev,
        selectedTable: tableName,
        tableColumns,
        mapping: {}, // Reset mapping when changing tables
      }));

      // Auto-match columns with similar names
      autoMapColumns(tableColumns, importState.columns);
    } catch (error) {
      console.error("Error fetching table columns:", error);
      toast.error("Erro ao buscar colunas da tabela");
    } finally {
      setColumnsLoading(false);
    }
  };

  // Auto-map columns with similar names
  const autoMapColumns = (
    tableColumns: TableColumn[],
    fileColumns: string[]
  ) => {
    if (!autoMapDone && fileColumns.length > 0 && tableColumns.length > 0) {
      const newMapping: { [key: string]: string } = {};

      // Compare each table column with file columns to find potential matches
      tableColumns.forEach((tableCol) => {
        const tableColName = tableCol.name.toLowerCase();
        // First try exact match
        const exactMatch = fileColumns.find(
          (fileCol) => fileCol.toLowerCase() === tableColName
        );

        if (exactMatch) {
          newMapping[tableCol.name] = exactMatch;
        } else {
          // Try partial match
          const partialMatch = fileColumns.find((fileCol) =>
            fileCol.toLowerCase().includes(tableColName) ||
            tableColName.includes(fileCol.toLowerCase())
          );
          
          if (partialMatch) {
            newMapping[tableCol.name] = partialMatch;
          }
        }
      });

      setImportState((prev) => ({
        ...prev,
        mapping: newMapping,
      }));
      setAutoMapDone(true);
    }
  };

  // Handle mapping changes
  const handleMappingChange = (tableColumn: string, fileColumn: string) => {
    setImportState((prev) => ({
      ...prev,
      mapping: {
        ...prev.mapping,
        [tableColumn]: fileColumn,
      },
    }));
  };

  // Prepare data for import
  const prepareDataForImport = () => {
    if (!importState.fileData) return [];

    const { mapping, tableColumns, selectedTable, fileData } = importState;

    // Special processing for certain tables
    let processedData = fileData.map((row) => {
      const newRow: any = {};

      // Map fields according to the user's mapping
      tableColumns.forEach((tableCol) => {
        const fileCol = mapping[tableCol.name];
        if (fileCol && row[fileCol] !== undefined) {
          let value = row[fileCol];

          // Process value based on column type
          if (tableCol.type === 'numeric') {
            // Handle numeric values
            if (typeof value === 'string') {
              // Replace comma with period for decimal numbers
              value = value.replace(',', '.');
              // Parse as float
              value = parseFloat(value);
              if (isNaN(value)) value = 0;
            }
          }

          newRow[tableCol.name] = value;
        }
      });

      // Apply table-specific processing
      if (selectedTable === 'customers') {
        // Add default values for certain fields if not provided
        newRow.allows_whatsapp = 
          newRow.allows_whatsapp === undefined ? true : newRow.allows_whatsapp;
      } else if (selectedTable === 'professionals') {
        // Ensure commission percentage is a number
        newRow.commission_percentage = parseFloat(newRow.commission_percentage) || 40;
        // Default active status
        newRow.is_active = true;
      } else if (selectedTable === 'services') {
        // Default values for services
        newRow.is_active = true;
        newRow.requires_two_professionals = 
          newRow.requires_two_professionals === undefined ? false : newRow.requires_two_professionals;
        newRow.professional_commission_percentage = 
          parseFloat(newRow.professional_commission_percentage) || 40;
      }

      return newRow;
    });

    // Filter out any rows that don't contain all required fields
    processedData = processedData.filter(row => {
      return tableColumns
        .filter(col => col.required)
        .every(col => row[col.name] !== undefined && row[col.name] !== "");
    });

    return processedData;
  };

  // Handle import data
  const handleImportData = async () => {
    try {
      setImporting(true);
      const dataToImport = prepareDataForImport();

      if (dataToImport.length === 0) {
        toast.error("Nenhum dado válido para importar");
        return;
      }

      // Import data to Supabase
      // Use asDbTable to ensure type safety
      const { data, error } = await supabase
        .from(asDbTable(importState.selectedTable))
        .insert(dataToImport)
        .select();

      if (error) {
        throw error;
      }

      // Update import results
      setImportResult(data || []);
      setShowResultDialog(true);
      toast.success(
        `${data?.length || 0} registros importados com sucesso para ${importState.selectedTable}`
      );
    } catch (error: any) {
      console.error("Error importing data:", error);
      toast.error(`Erro ao importar dados: ${error.message}`);
    } finally {
      setImporting(false);
    }
  };

  // Handle edit item
  const handleEditItem = (index: number) => {
    if (importResult && importResult[index]) {
      setCurrentEditIndex(index);
      setEditedItem({ ...importResult[index] });
      setIsEditDialogOpen(true);
    }
  };

  // Save edited item
  const saveEditedItem = async () => {
    if (editedItem && importState.selectedTable) {
      try {
        const { error } = await supabase
          .from(asDbTable(importState.selectedTable))
          .update(editedItem)
          .eq("id", editedItem.id);

        if (error) throw error;

        // Update the item in the local array
        if (currentEditIndex !== null) {
          const updatedResults = [...importResult];
          updatedResults[currentEditIndex] = editedItem;
          setImportResult(updatedResults);
        }

        toast.success("Item atualizado com sucesso");
        setIsEditDialogOpen(false);
      } catch (error) {
        console.error("Error updating item:", error);
        toast.error("Erro ao atualizar item");
      }
    }
  };

  // Handle view item
  const handleViewItem = (item: any) => {
    setCurrentViewItem(item);
    setIsViewDialogOpen(true);
  };

  // Handle delete item
  const handleDeleteItem = async (id: string) => {
    if (window.confirm("Tem certeza que deseja excluir este item?")) {
      try {
        const { error } = await supabase
          .from(asDbTable(importState.selectedTable))
          .delete()
          .eq("id", id);

        if (error) throw error;

        // Remove the item from the local array
        const updatedResults = importResult.filter(item => item.id !== id);
        setImportResult(updatedResults);

        toast.success("Item excluído com sucesso");
      } catch (error) {
        console.error("Error deleting item:", error);
        toast.error("Erro ao excluir item");
      }
    }
  };

  // Handle field change for edited item
  const handleFieldChange = (field: string, value: any) => {
    setEditedItem(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Render fields based on table
  const renderEditFields = () => {
    if (!editedItem) return null;

    return importState.tableColumns.map(col => {
      if (col.name === 'id' || col.name === 'created_at' || col.name === 'updated_at') {
        return null; // Skip these fields
      }

      return (
        <div key={col.name} className="grid gap-2">
          <Label htmlFor={`edit-${col.name}`}>{col.name}</Label>
          {col.type === 'numeric' ? (
            <Input 
              id={`edit-${col.name}`}
              type="number" 
              value={editedItem[col.name] || ''} 
              onChange={(e) => handleFieldChange(col.name, parseFloat(e.target.value))}
            />
          ) : (
            <Input 
              id={`edit-${col.name}`}
              value={editedItem[col.name] || ''} 
              onChange={(e) => handleFieldChange(col.name, e.target.value)}
            />
          )}
        </div>
      );
    });
  };

  // Adapter for FileUploadSection
  const handleFileInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileUpload(e.target.files[0]);
    }
  };

  return (
    <div className="space-y-8">
      <Card className="flex-1">
        <CardHeader>
          <CardTitle>Importar Dados</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Table selection */}
          <div>
            <Label htmlFor="table-select">Selecione a Tabela</Label>
            <Select
              value={importState.selectedTable}
              onValueChange={handleTableSelection}
            >
              <SelectTrigger className="w-[300px]">
                <SelectValue placeholder="Selecione uma tabela" />
              </SelectTrigger>
              <SelectContent>
                {tables.map((table) => (
                  <SelectItem key={table} value={table}>
                    {table}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* File upload section */}
          <FileUploadSection
            selectedFile={importState.file}
            onFileUpload={handleFileInputChange}
            isLoading={isLoading}
          />

          {/* Field mapping section */}
          {importState.file && importState.selectedTable && (
            <FieldMappingSection
              tableColumns={importState.tableColumns}
              fileColumns={importState.columns}
              mapping={importState.mapping}
              onMappingChange={handleMappingChange}
              isLoading={columnsLoading}
            />
          )}

          {/* Preview section */}
          {importState.preview.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Prévia dos Dados</h3>
              <div className="max-h-[300px] overflow-auto border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {importState.columns.map((col) => (
                        <TableHead key={col}>{col}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {importState.preview.map((row, rowIndex) => (
                      <TableRow key={rowIndex}>
                        {importState.columns.map((col) => (
                          <TableCell key={col}>{row[col]}</TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {/* Import button */}
          {importState.file && importState.selectedTable && (
            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() =>
                  navigate(`/${importState.selectedTable.toLowerCase()}`)
                }
              >
                Cancelar
              </Button>
              <Button
                onClick={handleImportData}
                disabled={
                  !importState.file ||
                  !importState.selectedTable ||
                  Object.keys(importState.mapping).length === 0 ||
                  importing
                }
              >
                {importing ? "Importando..." : "Importar Dados"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Results Dialog */}
      <Dialog open={showResultDialog} onOpenChange={setShowResultDialog}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Resultados da Importação</DialogTitle>
            <DialogDescription>
              {importResult.length} registro(s) importado(s) com sucesso
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[60vh] overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  {importState.tableColumns
                    .filter(col => col.name !== 'id' && col.name !== 'created_at' && col.name !== 'updated_at')
                    .slice(0, 4)
                    .map(col => (
                      <TableHead key={col.name}>{col.name}</TableHead>
                    ))
                  }
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {importResult.map((row, index) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-mono text-xs">
                      {row.id.substring(0, 8)}...
                    </TableCell>
                    {importState.tableColumns
                      .filter(col => col.name !== 'id' && col.name !== 'created_at' && col.name !== 'updated_at')
                      .slice(0, 4)
                      .map(col => (
                        <TableCell key={col.name}>{row[col.name]}</TableCell>
                      ))
                    }
                    <TableCell className="text-right">
                      <div className="flex justify-end space-x-2">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleViewItem(row)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleEditItem(index)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleDeleteItem(row.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <DialogFooter>
            <Button onClick={() => setShowResultDialog(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Item Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Item</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {renderEditFields()}
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsEditDialogOpen(false)}
            >
              Cancelar
            </Button>
            <Button onClick={saveEditedItem}>
              Salvar Alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Item Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Detalhes do Item</DialogTitle>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-auto">
            <Table>
              <TableBody>
                {currentViewItem && Object.entries(currentViewItem)
                  .filter(([key]) => key !== 'created_at' && key !== 'updated_at')
                  .map(([key, value]) => (
                    <TableRow key={key}>
                      <TableCell className="font-medium">{key}</TableCell>
                      <TableCell>
                        {typeof value === 'boolean'
                          ? value ? 'Sim' : 'Não'
                          : String(value)}
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </div>
          <DialogFooter>
            <Button onClick={() => setIsViewDialogOpen(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
