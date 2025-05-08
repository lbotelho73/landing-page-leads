
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload } from "lucide-react";
import { getFieldTranslation } from "@/lib/database-helpers";

interface FieldMapping {
  sourceField: string;
  targetField: string;
}

interface FieldMappingSectionProps {
  fieldMappings: FieldMapping[];
  tableColumns: string[];
  updateFieldMapping: (index: number, targetField: string) => void;
  onImportData: () => void;
  isImporting: boolean;
}

export function FieldMappingSection({ 
  fieldMappings, 
  tableColumns, 
  updateFieldMapping,
  onImportData,
  isImporting
}: FieldMappingSectionProps) {
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
                onValueChange={(value) => updateFieldMapping(index, value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar campo destino" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Ignorar este campo</SelectItem>
                  {tableColumns.map(column => (
                    <SelectItem key={column} value={column}>
                      {getFieldTranslation(column)} ({column})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        ))}
      </div>
      
      <div className="mt-6">
        <Button
          onClick={onImportData}
          className="bg-massage-500 hover:bg-massage-600"
          disabled={isImporting}
        >
          <Upload className="w-4 h-4 mr-2" />
          {isImporting ? "Importando..." : "Importar Dados"}
        </Button>
      </div>
    </div>
  );
}
