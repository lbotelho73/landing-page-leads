
import { useState, useEffect, useCallback } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { CustomerSearch } from "@/components/customers/CustomerSearch";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import type { Customer } from "@/lib/supabase";
import ptBR from "@/lib/i18n";
import { Trash2 } from "lucide-react";
import { BulkDeleteDialog } from "@/components/data/BulkDeleteDialog";
import { BulkDeleteButton } from "@/components/data/BulkDeleteButton";
import { asDbTable } from "@/lib/database-types";

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [referralSource, setReferralSource] = useState("");
  const [allowsWhatsapp, setAllowsWhatsapp] = useState(true);
  const [customerId, setCustomerId] = useState("");
  const [marketingChannels, setMarketingChannels] = useState<{
    id: string;
    name: string;
  }[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  
  const resetForm = useCallback(() => {
    setSelectedCustomer(null);
    setCustomerId("");
    setFirstName("");
    setLastName("");
    setWhatsappNumber("");
    setReferralSource("");
    setAllowsWhatsapp(true);
  }, []);
  
  useEffect(() => {
    fetchCustomers();
    fetchMarketingChannels();
  }, []);
  
  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      setCustomers(data || []);
    } catch (error) {
      console.error('Erro ao buscar clientes:', error);
      toast.error('Falha ao carregar clientes');
    } finally {
      setLoading(false);
    }
  };
  
  const fetchMarketingChannels = async () => {
    try {
      const { data, error } = await supabase
        .from('marketing_channels')
        .select('id, name')
        .eq('is_active', true)
        .order('name');
        
      if (error) throw error;
      setMarketingChannels(data || []);
    } catch (error) {
      console.error('Erro ao buscar canais de marketing:', error);
    }
  };
  
  const getNextCustomerId = async () => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('numeric_id')
        .order('numeric_id', { ascending: false })
        .limit(1);
        
      if (error) throw error;
      
      const lastId = data && data.length > 0 ? data[0].numeric_id || 0 : 0;
      return lastId + 1;
    } catch (error) {
      console.error('Erro ao obter próximo ID de cliente:', error);
      return 1; // Valor padrão se ocorrer erro
    }
  };
  
  const handleEditCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setCustomerId(customer.numeric_id?.toString() || "");
    setFirstName(customer.first_name);
    setLastName(customer.last_name);
    setWhatsappNumber(customer.whatsapp_number || "");
    setReferralSource(customer.referral_source || "");
    setAllowsWhatsapp(customer.allows_whatsapp);
    setOpen(true);
  };
  
  const handleDeleteCustomer = (customer: Customer) => {
    setCustomerToDelete(customer);
    setDeleteDialogOpen(true);
  };
  
  const confirmDeleteCustomer = async () => {
    if (!customerToDelete) return;
    
    try {
      const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', customerToDelete.id);
        
      if (error) throw error;
      
      setCustomers(customers.filter(c => c.id !== customerToDelete.id));
      toast.success('Cliente excluído com sucesso!');
      setDeleteDialogOpen(false);
      setCustomerToDelete(null);
    } catch (error) {
      console.error('Erro ao excluir cliente:', error);
      toast.error('Falha ao excluir cliente');
    }
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const customerData: any = {
        first_name: firstName,
        last_name: lastName,
        whatsapp_number: whatsappNumber,
        referral_source: referralSource,
        allows_whatsapp: allowsWhatsapp
      };
      
      if (selectedCustomer) {
        // Atualização de cliente existente
        const { error } = await supabase
          .from('customers')
          .update(customerData)
          .eq('id', selectedCustomer.id);
          
        if (error) throw error;
        
        toast.success("Cliente atualizado com sucesso!");
        fetchCustomers(); // Recarregar lista
      } else {
        // Novo cliente
        const nextId = await getNextCustomerId();
        customerData.numeric_id = nextId;
        
        const { error } = await supabase
          .from('customers')
          .insert([customerData]);
          
        if (error) throw error;
        
        toast.success("Cliente adicionado com sucesso!");
        fetchCustomers(); // Recarregar lista
      }
      
      setOpen(false);
      resetForm();
    } catch (error) {
      console.error('Erro ao salvar cliente:', error);
      toast.error('Falha ao salvar cliente');
    }
  };
  
  const handleSelectCustomer = (customer: Customer) => {
    handleEditCustomer(customer);
  };
  
  const handleCreateNew = () => {
    resetForm();
    setOpen(true);
  };
  
  // Make this function async since it uses await
  const handleDeleteSelected = async () => {
    if (!customerToDelete) return;
    
    try {
      const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', customerToDelete.id);
        
      if (error) throw error;
      
      setCustomers(customers.filter(c => c.id !== customerToDelete.id));
      toast.success('Cliente excluído com sucesso!');
      setDeleteDialogOpen(false);
      setCustomerToDelete(null);
    } catch (error) {
      console.error('Erro ao excluir cliente:', error);
      toast.error('Falha ao excluir cliente');
    }
  };
  
  return (
    <AppLayout>
      <div className="page-container">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">{ptBR.customers}</h1>
          <div className="flex gap-2">
            <BulkDeleteButton
              tableName={asDbTable("customers")}
              onSuccess={fetchCustomers}
              buttonText="Excluir em Massa"
              buttonVariant="outline"
            />
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button className="bg-massage-500 hover:bg-massage-600" onClick={resetForm}>
                  {ptBR.addCustomer}
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <form onSubmit={handleSubmit}>
                  <DialogHeader>
                    <DialogTitle>
                      {selectedCustomer ? "Editar Cliente" : ptBR.addCustomer}
                    </DialogTitle>
                    <DialogDescription>
                      Entre as informações de contato e preferências do cliente
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    {selectedCustomer && (
                      <div className="grid gap-2">
                        <Label htmlFor="customerId">{ptBR.customerId}</Label>
                        <Input 
                          id="customerId" 
                          value={customerId} 
                          disabled
                        />
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="firstName">{ptBR.firstName}</Label>
                        <Input 
                          id="firstName" 
                          value={firstName} 
                          onChange={(e) => setFirstName(e.target.value)} 
                          required 
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="lastName">{ptBR.lastName}</Label>
                        <Input 
                          id="lastName" 
                          value={lastName} 
                          onChange={(e) => setLastName(e.target.value)} 
                          required 
                        />
                      </div>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="whatsappNumber">{ptBR.whatsapp}</Label>
                      <Input 
                        id="whatsappNumber" 
                        value={whatsappNumber} 
                        onChange={(e) => setWhatsappNumber(e.target.value)} 
                        required 
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="referralSource">Como nos encontrou?</Label>
                      <Select value={referralSource} onValueChange={setReferralSource} required>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione a fonte de referência" />
                        </SelectTrigger>
                        <SelectContent>
                          {marketingChannels.map(channel => (
                            <SelectItem key={channel.id} value={channel.name}>{channel.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch 
                        id="allowsWhatsapp" 
                        checked={allowsWhatsapp} 
                        onCheckedChange={setAllowsWhatsapp} 
                      />
                      <Label htmlFor="allowsWhatsapp">{ptBR.allowWhatsApp}</Label>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                      {ptBR.cancel}
                    </Button>
                    <Button type="submit" className="bg-massage-500 hover:bg-massage-600">
                      {ptBR.save}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Buscar Cliente</CardTitle>
            <CardDescription>
              Pesquise clientes existentes pelo WhatsApp ou nome
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CustomerSearch 
              onSelectCustomer={handleSelectCustomer}
              onCreateNew={handleCreateNew}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Carteira de Clientes</CardTitle>
            <CardDescription>
              Gerencie a carteira de clientes da clínica e as informações de contato
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-4">{ptBR.loadingData}</div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>{ptBR.name}</TableHead>
                      <TableHead>{ptBR.whatsapp}</TableHead>
                      <TableHead>{ptBR.referralSource}</TableHead>
                      <TableHead>Permite WhatsApp</TableHead>
                      <TableHead className="text-right">{ptBR.actions}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {customers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center">
                          Ainda não há clientes cadastrados
                        </TableCell>
                      </TableRow>
                    ) : (
                      customers.map(customer => (
                        <TableRow key={customer.id}>
                          <TableCell>{customer.numeric_id || "-"}</TableCell>
                          <TableCell className="font-medium">
                            {`${customer.first_name} ${customer.last_name}`}
                          </TableCell>
                          <TableCell>{customer.whatsapp_number}</TableCell>
                          <TableCell>{customer.referral_source}</TableCell>
                          <TableCell>
                            {customer.allows_whatsapp ? "Sim" : "Não"}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => handleEditCustomer(customer)}
                              >
                                {ptBR.edit}
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => handleDeleteCustomer(customer)}
                                className="text-red-500 hover:text-red-700 hover:bg-red-100"
                              >
                                {ptBR.delete}
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
        
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{ptBR.confirmDelete}</AlertDialogTitle>
              <AlertDialogDescription>
                {ptBR.thisActionCannot}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{ptBR.cancel}</AlertDialogCancel>
              <AlertDialogAction 
                className="bg-red-500 hover:bg-red-600"
                onClick={confirmDeleteCustomer}
              >
                {ptBR.delete}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AppLayout>
  );
}
