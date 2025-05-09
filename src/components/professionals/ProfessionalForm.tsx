
import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface ProfessionalFormProps {
  professional?: any;
  onClose: () => void;
  onSubmit: () => void;
}

export function ProfessionalForm({ 
  professional, 
  onClose, 
  onSubmit 
}: ProfessionalFormProps) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [aliasName, setAliasName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [commissionPercentage, setCommissionPercentage] = useState<number>(0);
  const [isActive, setIsActive] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  useEffect(() => {
    if (professional) {
      setFirstName(professional.first_name || "");
      setLastName(professional.last_name || "");
      setAliasName(professional.alias_name || "");
      setEmail(professional.email || "");
      setPhone(professional.phone || "");
      setCommissionPercentage(professional.commission_percentage || 0);
      setIsActive(professional.is_active !== false); // Default to true if undefined
    }
  }, [professional]);
  
  const handleSubmit = async () => {
    if (!firstName || !lastName) {
      toast.error("Preencha o nome do profissional");
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const professionalData = {
        first_name: firstName,
        last_name: lastName,
        alias_name: aliasName || null,
        email: email || null,
        phone: phone || null,
        commission_percentage: commissionPercentage,
        is_active: isActive,
      };
      
      if (professional) {
        // Update existing professional
        const { error } = await supabase
          .from("professionals")
          .update(professionalData)
          .eq("id", professional.id);
        
        if (error) throw error;
        toast.success("Profissional atualizado com sucesso");
      } else {
        // Create new professional
        const { error } = await supabase
          .from("professionals")
          .insert(professionalData);
        
        if (error) throw error;
        toast.success("Profissional criado com sucesso");
      }
      
      onSubmit();
    } catch (error: any) {
      console.error("Error saving professional:", error);
      toast.error(`Erro ao salvar profissional: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl">
            {professional ? "Editar Profissional" : "Novo Profissional"}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">Nome *</Label>
              <Input
                id="firstName"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Nome"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="lastName">Sobrenome *</Label>
              <Input
                id="lastName"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Sobrenome"
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="aliasName">Nome de Tratamento</Label>
            <Input
              id="aliasName"
              value={aliasName}
              onChange={(e) => setAliasName(e.target.value)}
              placeholder="Como o profissional prefere ser chamado"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@exemplo.com"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="phone">Telefone</Label>
            <Input
              id="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(00) 00000-0000"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="commission">Comissão (%)</Label>
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
              id="active"
              checked={isActive}
              onCheckedChange={(checked) => setIsActive(!!checked)}
            />
            <Label htmlFor="active">Profissional ativo</Label>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Salvando..." : professional ? "Atualizar" : "Criar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
