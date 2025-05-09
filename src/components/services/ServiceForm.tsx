
import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface ServiceFormProps {
  service?: any;
  onClose: () => void;
  onSubmit: () => void;
}

export function ServiceForm({ 
  service, 
  onClose, 
  onSubmit 
}: ServiceFormProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState<number>(0);
  const [duration, setDuration] = useState<number>(60);
  const [category, setCategory] = useState<string>("");
  const [commissionPercentage, setCommissionPercentage] = useState<number>(0);
  const [requiresTwoProfessionals, setRequiresTwoProfessionals] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [categories, setCategories] = useState<any[]>([]);
  
  useEffect(() => {
    fetchCategories();
    
    if (service) {
      setName(service.name || "");
      setDescription(service.description || "");
      setPrice(service.price || 0);
      setDuration(service.duration || 60);
      setCategory(service.service_category_id || "");
      setCommissionPercentage(service.professional_commission_percentage || 0);
      setRequiresTwoProfessionals(service.requires_two_professionals || false);
      setIsActive(service.is_active !== false); // Default to true if undefined
    }
  }, [service]);
  
  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from("service_categories")
        .select("*")
        .order("name");
      
      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error("Error fetching categories:", error);
      toast.error("Erro ao carregar categorias");
    }
  };
  
  const handleSubmit = async () => {
    if (!name) {
      toast.error("Preencha o nome do serviço");
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const serviceData = {
        name,
        description,
        price,
        duration,
        service_category_id: category || null,
        professional_commission_percentage: commissionPercentage,
        requires_two_professionals: requiresTwoProfessionals,
        is_active: isActive,
      };
      
      if (service) {
        // Update existing service
        const { error } = await supabase
          .from("services")
          .update(serviceData)
          .eq("id", service.id);
        
        if (error) throw error;
        toast.success("Serviço atualizado com sucesso");
      } else {
        // Create new service
        const { error } = await supabase
          .from("services")
          .insert(serviceData);
        
        if (error) throw error;
        toast.success("Serviço criado com sucesso");
      }
      
      onSubmit();
    } catch (error: any) {
      console.error("Error saving service:", error);
      toast.error(`Erro ao salvar serviço: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl">
            {service ? "Editar Serviço" : "Novo Serviço"}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nome do serviço"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descrição do serviço"
              className="min-h-[80px]"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="price">Preço (R$)</Label>
              <Input
                id="price"
                type="number"
                value={price}
                onChange={(e) => setPrice(Number(e.target.value))}
                placeholder="0,00"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="duration">Duração (minutos)</Label>
              <Input
                id="duration"
                type="number"
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                placeholder="60"
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="category">Categoria</Label>
            <Select
              value={category || ""}
              onValueChange={setCategory}
            >
              <SelectTrigger id="category">
                <SelectValue placeholder="Selecione uma categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Nenhuma</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="commission">Comissão do profissional (%)</Label>
            <Input
              id="commission"
              type="number"
              value={commissionPercentage}
              onChange={(e) => setCommissionPercentage(Number(e.target.value))}
              placeholder="0"
            />
          </div>
          
          <div className="flex items-center space-x-2">
            <Checkbox
              id="two-professionals"
              checked={requiresTwoProfessionals}
              onCheckedChange={(checked) => setRequiresTwoProfessionals(!!checked)}
            />
            <Label htmlFor="two-professionals">
              Requer dois profissionais
            </Label>
          </div>
          
          <div className="flex items-center space-x-2">
            <Checkbox
              id="active"
              checked={isActive}
              onCheckedChange={(checked) => setIsActive(!!checked)}
            />
            <Label htmlFor="active">Serviço ativo</Label>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Salvando..." : service ? "Atualizar" : "Criar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
