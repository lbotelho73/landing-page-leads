
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload } from "lucide-react";

export interface FieldMapping {
  sourceField: string;
  targetField: string;
}

export interface FieldMappingSectionProps {
  fieldMappings?: FieldMapping[];
  tableColumns?: string[];
  updateFieldMapping?: (index: number, targetField: string) => void;
  onImportData?: () => void;
  isImporting?: boolean;
  csvHeaders?: string[];
  mappings?: Record<string, string>;
  onMappingChange?: (csvField: string, dbField: string) => void;
  onTableChange?: (table: string) => void;
  selectedTable?: string | null;
}

export function FieldMappingSection({ 
  fieldMappings = [], 
  tableColumns = [], 
  updateFieldMapping,
  onImportData,
  isImporting = false,
  csvHeaders = [],
  mappings = {},
  onMappingChange,
  onTableChange,
  selectedTable
}: FieldMappingSectionProps) {
  // If we have csvHeaders and mappings, use those instead of fieldMappings
  const useNewProps = csvHeaders.length > 0 && onMappingChange !== undefined;
  
  if (useNewProps) {
    return (
      <div className="mt-6">
        <h3 className="text-sm font-medium mb-2">Mapeamento de Campos</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Associe os campos do arquivo com os campos correspondentes no banco de dados
        </p>
        
        <div className="space-y-3">
          {csvHeaders.map((header) => (
            <div key={header} className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-muted-foreground">Campo no arquivo</label>
                <Input value={header} disabled />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Campo na tabela</label>
                <Select 
                  value={mappings[header] || ""} 
                  onValueChange={(value) => onMappingChange(header, value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um campo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Ignorar este campo</SelectItem>
                    {tableColumns.map((column) => (
                      <SelectItem key={column} value={column}>{column}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }
  
  // Original implementation for backward compatibility
  if (fieldMappings.length === 0) {
    return null;
  }
  
  return (
    <div className="mt-6">
      <h3 className="text-sm font-medium mb-2">Mapeamento de Campos</h3>
      <p className="text-sm text-muted-foreground mb-4">
        Associe os campos do arquivo com os campos correspondentes no banco de dados
      </p>
      
      <div className="space-y-3">
        {fieldMappings.map((mapping, index) => (
          <div key={index} className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-muted-foreground">Campo no arquivo</label>
              <Input value={mapping.sourceField} disabled />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Campo na tabela</label>
              <Select 
                value={mapping.targetField} 
                onValueChange={(value) => updateFieldMapping && updateFieldMapping(index, value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um campo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Ignorar este campo</SelectItem>
                  {tableColumns.map((column) => (
                    <SelectItem key={column} value={column}>{column}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        ))}
      </div>
      
      {onImportData && (
        <div className="mt-6 flex justify-end">
          <Button 
            onClick={onImportData}
            className="bg-massage-500 hover:bg-massage-600"
            disabled={isImporting}
          >
            <Upload className="w-4 h-4 mr-2" />
            {isImporting ? "Importando..." : "Importar Dados"}
          </Button>
        </div>
      )}
    </div>
  );
}
