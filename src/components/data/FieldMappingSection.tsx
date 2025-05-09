
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
  
  // Fetch columns for selected table
  useEffect(() => {
    const fetchTableColumns = async () => {
      if (!selectedTable) {
        setAvailableColumns([]);
        return;
      }
      
      setLoading(true);
      try {
        const { data, error } = await supabase.rpc('get_table_columns', { 
          table_name: selectedTable 
        });
        
        if (error) {
          console.error("Error fetching table columns:", error);
          return;
        }
        
        if (data && Array.isArray(data)) {
          setAvailableColumns(data);
        }
      } catch (err) {
        console.error("Failed to fetch table columns:", err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchTableColumns();
  }, [selectedTable]);
  
  useEffect(() => {
    // Filter CSV headers based on search term
    if (searchTerm) {
      const filtered = csvHeaders.filter(header => 
        header.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredHeaders(filtered);
    } else {
      setFilteredHeaders(csvHeaders);
    }
  }, [searchTerm, csvHeaders]);
  
  const guessMatchingColumn = (csvHeader: string): string => {
    // Simple logic to guess matching column
    const normalized = csvHeader.toLowerCase().replace(/[_\s]/g, '');
    
    // Try exact match first
    let match = availableColumns.find(
      col => col.toLowerCase() === csvHeader.toLowerCase()
    );
    
    if (match) return match;
    
    // Try to match without spaces and underscores
    match = availableColumns.find(
      col => col.toLowerCase().replace(/[_\s]/g, '') === normalized
    );
    
    if (match) return match;
    
    // Try partial match
    match = availableColumns.find(
      col => col.toLowerCase().includes(normalized) || normalized.includes(col.toLowerCase())
    );
    
    return match || "";
  };
  
  // Auto-map fields that look similar
  useEffect(() => {
    if (csvHeaders.length > 0 && availableColumns.length > 0) {
      const initialMappings: Record<string, string> = {};
      
      csvHeaders.forEach(header => {
        const guess = guessMatchingColumn(header);
        if (guess) {
          initialMappings[header] = guess;
          onMappingChange(header, guess);
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
              filteredHeaders.map((header) => (
                <div key={header} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
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
                        {availableColumns.map((column) => (
                          <SelectItem key={column} value={column}>{column}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
