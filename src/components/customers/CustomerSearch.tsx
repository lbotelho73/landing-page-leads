
import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Search, User, Phone } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Customer } from "@/lib/supabase";
import ptBR from "@/lib/i18n";

interface CustomerSearchProps {
  onSelectCustomer: (customer: Customer) => void;
  onCreateNew: () => void;
  value?: Customer | null;
  onSelect?: (customer: Customer) => void;
}

export function CustomerSearch({ 
  onSelectCustomer, 
  onCreateNew, 
  value, 
  onSelect 
}: CustomerSearchProps) {
  const [searchType, setSearchType] = useState<"whatsapp" | "name">("whatsapp");
  const [searchTerm, setSearchTerm] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<Customer[]>([]);
  const [showResults, setShowResults] = useState(false);
  
  // Add default implementations for the required props if not provided
  const handleSelectCustomer = (customer: Customer) => {
    if (onSelect) onSelect(customer);
    if (onSelectCustomer) onSelectCustomer(customer);
  };
  
  const handleCreateNew = () => {
    if (onCreateNew) onCreateNew();
  };
  
  useEffect(() => {
    // Limpamos os resultados quando o termo de pesquisa muda
    if (searchTerm.length === 0) {
      setResults([]);
      setShowResults(false);
    }
    
    // Pesquisa automática quando o termo tem pelo menos 3 caracteres
    if (searchTerm.length >= 3) {
      const debounce = setTimeout(() => {
        handleSearch();
      }, 300);
      
      return () => clearTimeout(debounce);
    }
  }, [searchTerm, searchType]);
  
  const handleSearch = async () => {
    if (!searchTerm || searchTerm.length < 3) {
      return;
    }
    
    setIsSearching(true);
    setShowResults(true);
    
    try {
      let query = supabase.from('customers').select('*');
      
      if (searchType === "whatsapp") {
        query = query.ilike('whatsapp_number', `%${searchTerm}%`);
      } else {
        query = query.or(`first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%`);
      }
      
      const { data, error } = await query.limit(5);
      
      if (error) throw error;
      setResults(data || []);
    } catch (error) {
      console.error("Erro ao buscar clientes:", error);
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  };
  
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };
  
  return (
    <div className="space-y-2 relative">
      <Tabs 
        defaultValue="whatsapp" 
        value={searchType} 
        onValueChange={(value) => setSearchType(value as "whatsapp" | "name")} 
        className="w-full"
      >
        <TabsList className="grid grid-cols-2">
          <TabsTrigger value="whatsapp">
            <Phone className="h-3.5 w-3.5 mr-2" />
            {ptBR.whatsapp}
          </TabsTrigger>
          <TabsTrigger value="name">
            <User className="h-3.5 w-3.5 mr-2" />
            {ptBR.name}
          </TabsTrigger>
        </TabsList>
      </Tabs>
      
      <div className="flex w-full max-w-sm items-center space-x-2">
        <Input
          placeholder={searchType === "whatsapp" ? ptBR.searchByWhatsApp : ptBR.searchByName}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <Button 
          type="button" 
          className="bg-massage-500 hover:bg-massage-600"
          onClick={handleSearch}
          disabled={isSearching || searchTerm.length < 3}
        >
          <Search className="h-4 w-4" />
        </Button>
      </div>
      
      {showResults && (
        <Card className="absolute z-10 w-full max-h-80 overflow-y-auto mt-1 shadow-lg">
          <div className="p-2">
            {isSearching ? (
              <div className="text-center py-4 text-sm text-muted-foreground">
                {ptBR.loadingData}
              </div>
            ) : results.length > 0 ? (
              <div className="divide-y">
                {results.map(customer => (
                  <div
                    key={customer.id}
                    className="p-2 hover:bg-muted cursor-pointer transition-colors"
                    onClick={() => handleSelectCustomer(customer)}
                  >
                    <div className="font-medium">
                      {customer.first_name} {customer.last_name}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {customer.whatsapp_number}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-3 py-3">
                <div className="text-center text-sm text-muted-foreground">
                  {ptBR.noResultsFound}
                </div>
                <div className="text-center">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleCreateNew}
                  >
                    {ptBR.addCustomer}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </Card>
      )}
      
      {value && !showResults && (
        <div className="p-2 bg-muted rounded-md">
          <div className="font-medium">
            {value.first_name} {value.last_name}
          </div>
          <div className="text-sm text-muted-foreground">
            {value.whatsapp_number}
          </div>
        </div>
      )}
    </div>
  );
}
