
import { useState, useEffect } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";

interface FieldMappingProps {
  csvHeaders: string[];
  tableColumns: string[];
  mappings: Record<string, string>;
  onMappingChange: (csvField: string, dbField: string) => void;
  onTableChange: (table: string) => void;
  selectedTable: string | null;
  tables: { id: string; name: string }[];
}

export function FieldMappingSection({
  csvHeaders,
  tableColumns,
  mappings,
  onMappingChange,
  onTableChange,
  selectedTable,
  tables
}: FieldMappingProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredHeaders, setFilteredHeaders] = useState<string[]>(csvHeaders);
  const [loading, setLoading] = useState(false);
  const [availableColumns, setAvailableColumns] = useState<string[]>(tableColumns);
  
  useEffect(() => {
    const fetchTableColumns = async () => {
      if (!selectedTable) {
        setAvailableColumns([]);
        return;
      }
      setLoading(true);
      try {
        const { data, error } = await supabase.rpc('get_table_columns', { table_name: selectedTable });
        if (error) {
          console.error("Error fetching columns:", error);
          return;
        }
        if (data && Array.isArray(data)) {
          // Ensure all column names are strings
          const columnNames = data.map(col => {
            if (typeof col === 'object' && col !== null && 'column_name' in col) {
              return String(col.column_name);
            }
            return String(col);
          }).filter(Boolean);
          setAvailableColumns(columnNames);
        }
      } catch (error) { 
        console.error("Error in fetch:", error);
      } finally { 
        setLoading(false); 
      }
    };
    fetchTableColumns();
  }, [selectedTable]);
  
  useEffect(() => {
    if (searchTerm) {
      const filtered = csvHeaders.filter(header => 
        header && typeof header === 'string' && header.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredHeaders(filtered);
    } else {
      setFilteredHeaders(csvHeaders);
    }
  }, [searchTerm, csvHeaders]);
  
  const guessMatchingColumn = (csvHeader: string): string => {
    if (!csvHeader || typeof csvHeader !== 'string') return "";
    
    const normalized = csvHeader.toLowerCase().replace(/[_\s]/g, '');
    
    // Try exact match first
    let match = availableColumns.find(
      col => typeof col === 'string' && col.toLowerCase() === csvHeader.toLowerCase()
    );
    if (match) return match;
    
    // Try normalized match
    match = availableColumns.find(
      col => typeof col === 'string' && col.toLowerCase().replace(/[_\s]/g, '') === normalized
    );
    if (match) return match;
    
    // Try partial match
    match = availableColumns.find(
      col => typeof col === 'string' && 
        (col.toLowerCase().includes(normalized) || normalized.includes(col.toLowerCase()))
    );
    
    return match || "";
  };
  
  useEffect(() => {
    if (csvHeaders.length > 0 && availableColumns.length > 0) {
      const initialMappings: Record<string, string> = {};
      csvHeaders.forEach(header => {
        if (header && typeof header === 'string') {
          const guess = guessMatchingColumn(header);
          if (guess) {
            initialMappings[header] = guess;
            onMappingChange(header, guess);
          }
        }
      });
    }
  }, [csvHeaders, availableColumns]); // eslint-disable-line react-hooks/exhaustive-deps
  
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="mb-6 space-y-4">
          <div className="flex flex-col space-y-2">
            <Label htmlFor="table-select">Selecione a tabela para importação</Label>
            <Select 
              value={selectedTable || ''} 
              onValueChange={onTableChange}
            >
              <SelectTrigger id="table-select" className="w-full">
                <SelectValue placeholder="Selecione a tabela" />
              </SelectTrigger>
              <SelectContent>
                {tables.map((table) => (
                  <SelectItem key={table.id} value={table.id}>{table.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label htmlFor="search-field">Buscar campos</Label>
            <Input
              id="search-field"
              type="text"
              placeholder="Filtrar campos CSV..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="mb-4"
            />
          </div>
        </div>
        
        {loading ? (
          <div className="text-center py-4">Carregando colunas da tabela...</div>
        ) : (
          <div className="space-y-4 max-h-[400px] overflow-y-auto">
            {filteredHeaders.length === 0 ? (
              <div className="text-center text-muted-foreground py-4">
                Nenhum campo encontrado
              </div>
            ) : (
              filteredHeaders.map((header, index) => (
                header && typeof header === 'string' ? (
                  <div key={`${header}-${index}`} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                    <div className="font-medium truncate">{header}</div>
                    <div className="col-span-2">
                      <Select 
                        value={mappings[header] || ''} 
                        onValueChange={(value) => onMappingChange(header, value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecionar coluna" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">Ignorar este campo</SelectItem>
                          {availableColumns.map((column, idx) => (
                            <SelectItem key={`${column}-${idx}`} value={column}>{column}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                ) : null
              )).filter(Boolean)
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
