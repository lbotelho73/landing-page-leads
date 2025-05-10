import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import ptBR from "@/lib/i18n";

interface PaymentMethod {
  id: string;
  name: string;
  additional_fee_percentage: number;
  is_active: boolean;
}

interface MarketingChannel {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
}

interface ServiceCategory {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
}

interface WorkingDay {
  day: string;
  is_working: boolean;
  start_time: string;
  end_time: string;
}

interface UserRole {
  id: string;
  name: string;
  description: string;
}

interface UserProfile {
  id: string;
  email: string;
  role: string;
  created_at: string;
}

interface Permission {
  id: string;
  name: string;
  description: string;
  administrator: boolean;
  editor: boolean;
  viewer: boolean;
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("payment-methods");
  
  // Estados para métodos de pagamento
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [newPaymentName, setNewPaymentName] = useState("");
  const [newPaymentFee, setNewPaymentFee] = useState("");
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod | null>(null);
  
  // Estados para canais de marketing
  const [marketingChannels, setMarketingChannels] = useState<MarketingChannel[]>([]);
  const [newChannelName, setNewChannelName] = useState("");
  const [newChannelDescription, setNewChannelDescription] = useState("");
  const [isChannelDialogOpen, setIsChannelDialogOpen] = useState(false);
  const [selectedChannel, setSelectedChannel] = useState<MarketingChannel | null>(null);
  
  // Estados para categorias de serviço
  const [serviceCategories, setServiceCategories] = useState<ServiceCategory[]>([]);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryDescription, setNewCategoryDescription] = useState("");
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<ServiceCategory | null>(null);
  
  // Estados para dias de funcionamento
  const [workingDays, setWorkingDays] = useState<WorkingDay[]>([
    { day: "monday", is_working: true, start_time: "09:00", end_time: "18:00" },
    { day: "tuesday", is_working: true, start_time: "09:00", end_time: "18:00" },
    { day: "wednesday", is_working: true, start_time: "09:00", end_time: "18:00" },
    { day: "thursday", is_working: true, start_time: "09:00", end_time: "18:00" },
    { day: "friday", is_working: true, start_time: "09:00", end_time: "18:00" },
    { day: "saturday", is_working: true, start_time: "10:00", end_time: "16:00" },
    { day: "sunday", is_working: false, start_time: "10:00", end_time: "16:00" }
  ]);
  
  // Estados gerais
  const [isLoading, setIsLoading] = useState(false);
  
  useEffect(() => {
    fetchPaymentMethods();
    fetchMarketingChannels();
    fetchServiceCategories();
    fetchWorkingDays();
  }, []);
  
  // Métodos de pagamento
  const fetchPaymentMethods = async () => {
    try {
      const { data, error } = await supabase
        .from('payment_methods')
        .select('*')
        .order('name');
      
      if (error) throw error;
      setPaymentMethods(data || []);
    } catch (error) {
      console.error("Erro ao buscar métodos de pagamento:", error);
      toast.error("Erro ao carregar métodos de pagamento");
    }
  };
  
  const handlePaymentMethodSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      const paymentData = {
        name: newPaymentName,
        additional_fee_percentage: parseFloat(newPaymentFee) || 0,
        is_active: true
      };
      
      if (selectedPaymentMethod) {
        // Atualizar existente
        const { error } = await supabase
          .from('payment_methods')
          .update(paymentData)
          .eq('id', selectedPaymentMethod.id);
          
        if (error) throw error;
        toast.success("Método de pagamento atualizado com sucesso!");
      } else {
        // Criar novo
        const { error } = await supabase
          .from('payment_methods')
          .insert([paymentData]);
          
        if (error) throw error;
        toast.success("Método de pagamento adicionado com sucesso!");
      }
      
      setIsPaymentDialogOpen(false);
      resetPaymentForm();
      fetchPaymentMethods();
    } catch (error) {
      console.error("Erro ao salvar método de pagamento:", error);
      toast.error("Erro ao salvar método de pagamento");
    } finally {
      setIsLoading(false);
    }
  };
  
  const togglePaymentMethodStatus = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('payment_methods')
        .update({ is_active: !currentStatus })
        .eq('id', id);
        
      if (error) throw error;
      fetchPaymentMethods();
      toast.success("Status atualizado com sucesso!");
    } catch (error) {
      console.error("Erro ao atualizar status:", error);
      toast.error("Erro ao atualizar status");
    }
  };
  
  const editPaymentMethod = (paymentMethod: PaymentMethod) => {
    setSelectedPaymentMethod(paymentMethod);
    setNewPaymentName(paymentMethod.name);
    setNewPaymentFee(paymentMethod.additional_fee_percentage.toString());
    setIsPaymentDialogOpen(true);
  };
  
  const resetPaymentForm = () => {
    setSelectedPaymentMethod(null);
    setNewPaymentName("");
    setNewPaymentFee("");
  };
  
  // Canais de marketing
  const fetchMarketingChannels = async () => {
    try {
      const { data, error } = await supabase
        .from('marketing_channels')
        .select('*')
        .order('name');
      
      if (error) throw error;
      setMarketingChannels(data || []);
    } catch (error) {
      console.error("Erro ao buscar canais de marketing:", error);
      toast.error("Erro ao carregar canais de marketing");
    }
  };
  
  const handleMarketingChannelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      const channelData = {
        name: newChannelName,
        description: newChannelDescription || null,
        is_active: true
      };
      
      if (selectedChannel) {
        // Atualizar existente
        const { error } = await supabase
          .from('marketing_channels')
          .update(channelData)
          .eq('id', selectedChannel.id);
          
        if (error) throw error;
        toast.success("Canal de marketing atualizado com sucesso!");
      } else {
        // Criar novo
        const { error } = await supabase
          .from('marketing_channels')
          .insert([channelData]);
          
        if (error) throw error;
        toast.success("Canal de marketing adicionado com sucesso!");
      }
      
      setIsChannelDialogOpen(false);
      resetChannelForm();
      fetchMarketingChannels();
    } catch (error) {
      console.error("Erro ao salvar canal de marketing:", error);
      toast.error("Erro ao salvar canal de marketing");
    } finally {
      setIsLoading(false);
    }
  };
  
  const toggleChannelStatus = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('marketing_channels')
        .update({ is_active: !currentStatus })
        .eq('id', id);
        
      if (error) throw error;
      fetchMarketingChannels();
      toast.success("Status atualizado com sucesso!");
    } catch (error) {
      console.error("Erro ao atualizar status:", error);
      toast.error("Erro ao atualizar status");
    }
  };
  
  const editMarketingChannel = (channel: MarketingChannel) => {
    setSelectedChannel(channel);
    setNewChannelName(channel.name);
    setNewChannelDescription(channel.description || "");
    setIsChannelDialogOpen(true);
  };
  
  const resetChannelForm = () => {
    setSelectedChannel(null);
    setNewChannelName("");
    setNewChannelDescription("");
  };
  
  // Categorias de serviço
  const fetchServiceCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('service_categories')
        .select('*')
        .order('name');
      
      if (error) throw error;
      setServiceCategories(data || []);
    } catch (error) {
      console.error("Erro ao buscar categorias de serviço:", error);
      toast.error("Erro ao carregar categorias de serviço");
    }
  };
  
  const handleServiceCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      const categoryData = {
        name: newCategoryName,
        description: newCategoryDescription || null,
        is_active: true
      };
      
      if (selectedCategory) {
        // Atualizar existente
        const { error } = await supabase
          .from('service_categories')
          .update(categoryData)
          .eq('id', selectedCategory.id);
          
        if (error) throw error;
        toast.success("Categoria de serviço atualizada com sucesso!");
      } else {
        // Criar nova
        const { error } = await supabase
          .from('service_categories')
          .insert([categoryData]);
          
        if (error) throw error;
        toast.success("Categoria de serviço adicionada com sucesso!");
      }
      
      setIsCategoryDialogOpen(false);
      resetCategoryForm();
      fetchServiceCategories();
    } catch (error) {
      console.error("Erro ao salvar categoria de serviço:", error);
      toast.error("Erro ao salvar categoria de serviço");
    } finally {
      setIsLoading(false);
    }
  };
  
  const toggleCategoryStatus = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('service_categories')
        .update({ is_active: !currentStatus })
        .eq('id', id);
        
      if (error) throw error;
      fetchServiceCategories();
      toast.success("Status atualizado com sucesso!");
    } catch (error) {
      console.error("Erro ao atualizar status:", error);
      toast.error("Erro ao atualizar status");
    }
  };
  
  const editServiceCategory = (category: ServiceCategory) => {
    setSelectedCategory(category);
    setNewCategoryName(category.name);
    setNewCategoryDescription(category.description || "");
    setIsCategoryDialogOpen(true);
  };
  
  const resetCategoryForm = () => {
    setSelectedCategory(null);
    setNewCategoryName("");
    setNewCategoryDescription("");
  };
  
  // Dias de funcionamento
  const fetchWorkingDays = async () => {
    try {
      const { data, error } = await supabase
        .from('business_hours')
        .select('*')
        .order('day');
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        setWorkingDays(data.map((day: any) => ({
          day: day.day,
          is_working: day.is_working,
          start_time: day.start_time,
          end_time: day.end_time
        })));
      }
    } catch (error) {
      console.error("Erro ao buscar dias de funcionamento:", error);
    }
  };
  
  const saveWorkingDays = async () => {
    setIsLoading(true);
    try {
      // Primeiro verifica se já existem registros
      const { data } = await supabase
        .from('business_hours')
        .select('id');
      
      if (data && data.length > 0) {
        // Atualiza registros existentes
        for (const day of workingDays) {
          await supabase
            .from('business_hours')
            .update({
              is_working: day.is_working,
              start_time: day.start_time,
              end_time: day.end_time
            })
            .eq('day', day.day);
        }
      } else {
        // Cria novos registros
        await supabase
          .from('business_hours')
          .insert(workingDays);
      }
      
      toast.success("Dias de funcionamento salvos com sucesso!");
    } catch (error) {
      console.error("Erro ao salvar dias de funcionamento:", error);
      toast.error("Erro ao salvar dias de funcionamento");
    } finally {
      setIsLoading(false);
    }
  };
  
  const updateWorkingDay = (index: number, field: string, value: any) => {
    const updatedDays = [...workingDays];
    updatedDays[index] = {
      ...updatedDays[index],
      [field]: value
    };
    setWorkingDays(updatedDays);
  };
  
  const getDayName = (day: string) => {
    const dayNames: Record<string, string> = {
      monday: ptBR.monday,
      tuesday: ptBR.tuesday,
      wednesday: ptBR.wednesday,
      thursday: ptBR.thursday,
      friday: ptBR.friday,
      saturday: ptBR.saturday,
      sunday: ptBR.sunday
    };
    
    return dayNames[day] || day;
  };
  
  // Perfis de usuário
  const fetchUserProfiles = async () => {
    try {
      // Mock data for now - in a real app, this would come from your user database
      setUserProfiles([
        { id: "1", email: "admin@example.com", role: "administrator", created_at: "2025-01-01" },
        { id: "2", email: "editor@example.com", role: "editor", created_at: "2025-01-02" },
        { id: "3", email: "viewer@example.com", role: "viewer", created_at: "2025-01-03" }
      ]);
    } catch (error) {
      console.error("Erro ao buscar perfis de usuário:", error);
      toast.error("Erro ao carregar perfis de usuário");
    }
  };
  
  const handleUserProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      // Mock update for now
      if (selectedUser) {
        // Update existing user role
        setUserProfiles(prev => 
          prev.map(user => 
            user.id === selectedUser.id 
              ? {...user, role: selectedRole} 
              : user
          )
        );
        toast.success("Perfil de usuário atualizado com sucesso!");
      } else {
        // In a real app, this would create a user or update permissions
        toast.success("Perfil de usuário atualizado com sucesso!");
      }
      
      setIsUserDialogOpen(false);
      setSelectedUser(null);
      setSelectedRole("viewer");
    } catch (error) {
      console.error("Erro ao salvar perfil de usuário:", error);
      toast.error("Erro ao salvar perfil de usuário");
    } finally {
      setIsLoading(false);
    }
  };
  
  const editUserProfile = (user: UserProfile) => {
    setSelectedUser(user);
    setSelectedRole(user.role);
    setIsUserDialogOpen(true);
  };
  
  const getRoleName = (roleId: string): string => {
    return userRoles.find(role => role.id === roleId)?.name || roleId;
  };
  
  const togglePermission = (id: string, role: 'administrator' | 'editor' | 'viewer', currentValue: boolean) => {
    const updatedPermissions = permissions.map(permission => 
      permission.id === id 
        ? {...permission, [role]: !currentValue} 
        : permission
    );
    setPermissions(updatedPermissions);
  };
  
  return (
    <AppLayout>
      <div className="page-container">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">{ptBR.generalSettings}</h1>
        </div>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="flex flex-wrap">
            <TabsTrigger value="payment-methods">{ptBR.paymentMethods}</TabsTrigger>
            <TabsTrigger value="marketing-channels">{ptBR.marketingChannels}</TabsTrigger>
            <TabsTrigger value="service-categories">{ptBR.serviceCategories}</TabsTrigger>
            <TabsTrigger value="working-days">{ptBR.workingDays}</TabsTrigger>
            <TabsTrigger value="user-profiles">Perfis de Usuário</TabsTrigger>
          </TabsList>
          
          {/* Métodos de Pagamento */}
          <TabsContent value="payment-methods" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>{ptBR.paymentMethods}</CardTitle>
                    <CardDescription>Gerencie as formas de pagamento aceitas pela clínica</CardDescription>
                  </div>
                  <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
                    <DialogTrigger asChild>
                      <Button 
                        className="bg-massage-500 hover:bg-massage-600"
                        onClick={() => resetPaymentForm()}
                      >
                        {ptBR.addPaymentMethod}
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <form onSubmit={handlePaymentMethodSubmit}>
                        <DialogHeader>
                          <DialogTitle>
                            {selectedPaymentMethod ? "Editar Método de Pagamento" : ptBR.addPaymentMethod}
                          </DialogTitle>
                          <DialogDescription>
                            Preencha os detalhes da forma de pagamento
                          </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                          <div className="grid gap-2">
                            <Label htmlFor="paymentName">{ptBR.name}</Label>
                            <Input 
                              id="paymentName" 
                              value={newPaymentName} 
                              onChange={(e) => setNewPaymentName(e.target.value)} 
                              required 
                            />
                          </div>
                          <div className="grid gap-2">
                            <Label htmlFor="paymentFee">{ptBR.additionalFee} (%)</Label>
                            <Input 
                              id="paymentFee" 
                              type="number" 
                              min="0" 
                              max="100" 
                              step="0.1"
                              value={newPaymentFee} 
                              onChange={(e) => setNewPaymentFee(e.target.value)} 
                              required 
                            />
                          </div>
                        </div>
                        <DialogFooter>
                          <Button 
                            type="button" 
                            variant="outline" 
                            onClick={() => setIsPaymentDialogOpen(false)}
                          >
                            {ptBR.cancel}
                          </Button>
                          <Button 
                            type="submit" 
                            className="bg-massage-500 hover:bg-massage-600" 
                            disabled={isLoading}
                          >
                            {isLoading ? "Salvando..." : ptBR.save}
                          </Button>
                        </DialogFooter>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{ptBR.name}</TableHead>
                        <TableHead>{ptBR.additionalFee} (%)</TableHead>
                        <TableHead>{ptBR.status}</TableHead>
                        <TableHead className="text-right">{ptBR.actions}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paymentMethods.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center">{ptBR.noDataAvailable}</TableCell>
                        </TableRow>
                      ) : (
                        paymentMethods.map((method) => (
                          <TableRow key={method.id}>
                            <TableCell className="font-medium">{method.name}</TableCell>
                            <TableCell>{method.additional_fee_percentage}%</TableCell>
                            <TableCell>
                              <Switch
                                checked={method.is_active}
                                onCheckedChange={() => togglePaymentMethodStatus(method.id, method.is_active)}
                              />
                            </TableCell>
                            <TableCell className="text-right">
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => editPaymentMethod(method)}
                              >
                                {ptBR.edit}
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Canais de Marketing */}
          <TabsContent value="marketing-channels" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>{ptBR.marketingChannels}</CardTitle>
                    <CardDescription>Gerencie os canais de marketing utilizados pela clínica</CardDescription>
                  </div>
                  <Dialog open={isChannelDialogOpen} onOpenChange={setIsChannelDialogOpen}>
                    <DialogTrigger asChild>
                      <Button 
                        className="bg-massage-500 hover:bg-massage-600"
                        onClick={() => resetChannelForm()}
                      >
                        {ptBR.addChannel}
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <form onSubmit={handleMarketingChannelSubmit}>
                        <DialogHeader>
                          <DialogTitle>
                            {selectedChannel ? "Editar Canal de Marketing" : ptBR.addChannel}
                          </DialogTitle>
                          <DialogDescription>
                            Preencha os detalhes do canal de marketing
                          </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                          <div className="grid gap-2">
                            <Label htmlFor="channelName">{ptBR.channelName}</Label>
                            <Input 
                              id="channelName" 
                              value={newChannelName} 
                              onChange={(e) => setNewChannelName(e.target.value)} 
                              required 
                            />
                          </div>
                          <div className="grid gap-2">
                            <Label htmlFor="channelDescription">{ptBR.description}</Label>
                            <Input 
                              id="channelDescription" 
                              value={newChannelDescription} 
                              onChange={(e) => setNewChannelDescription(e.target.value)} 
                            />
                          </div>
                        </div>
                        <DialogFooter>
                          <Button 
                            type="button" 
                            variant="outline" 
                            onClick={() => setIsChannelDialogOpen(false)}
                          >
                            {ptBR.cancel}
                          </Button>
                          <Button 
                            type="submit" 
                            className="bg-massage-500 hover:bg-massage-600" 
                            disabled={isLoading}
                          >
                            {isLoading ? "Salvando..." : ptBR.save}
                          </Button>
                        </DialogFooter>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{ptBR.name}</TableHead>
                        <TableHead>{ptBR.description}</TableHead>
                        <TableHead>{ptBR.status}</TableHead>
                        <TableHead className="text-right">{ptBR.actions}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {marketingChannels.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center">{ptBR.noDataAvailable}</TableCell>
                        </TableRow>
                      ) : (
                        marketingChannels.map((channel) => (
                          <TableRow key={channel.id}>
                            <TableCell className="font-medium">{channel.name}</TableCell>
                            <TableCell>{channel.description}</TableCell>
                            <TableCell>
                              <Switch
                                checked={channel.is_active}
                                onCheckedChange={() => toggleChannelStatus(channel.id, channel.is_active)}
                              />
                            </TableCell>
                            <TableCell className="text-right">
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => editMarketingChannel(channel)}
                              >
                                {ptBR.edit}
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Categorias de Serviço */}
          <TabsContent value="service-categories" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>{ptBR.serviceCategories}</CardTitle>
                    <CardDescription>Gerencie as categorias de serviços oferecidos pela clínica</CardDescription>
                  </div>
                  <Dialog open={isCategoryDialogOpen} onOpenChange={setIsCategoryDialogOpen}>
                    <DialogTrigger asChild>
                      <Button 
                        className="bg-massage-500 hover:bg-massage-600"
                        onClick={() => resetCategoryForm()}
                      >
                        Adicionar Categoria de Serviço
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <form onSubmit={handleServiceCategorySubmit}>
                        <DialogHeader>
                          <DialogTitle>
                            {selectedCategory ? "Editar Categoria de Serviço" : "Adicionar Categoria de Serviço"}
                          </DialogTitle>
                          <DialogDescription>
                            Preencha os detalhes da categoria de serviço
                          </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                          <div className="grid gap-2">
                            <Label htmlFor="categoryName">{ptBR.name}</Label>
                            <Input 
                              id="categoryName" 
                              value={newCategoryName} 
                              onChange={(e) => setNewCategoryName(e.target.value)} 
                              required 
                            />
                          </div>
                          <div className="grid gap-2">
                            <Label htmlFor="categoryDescription">{ptBR.description}</Label>
                            <Input 
                              id="categoryDescription" 
                              value={newCategoryDescription} 
                              onChange={(e) => setNewCategoryDescription(e.target.value)} 
                            />
                          </div>
                        </div>
                        <DialogFooter>
                          <Button 
                            type="button" 
                            variant="outline" 
                            onClick={() => setIsCategoryDialogOpen(false)}
                          >
                            {ptBR.cancel}
                          </Button>
                          <Button 
                            type="submit" 
                            className="bg-massage-500 hover:bg-massage-600" 
                            disabled={isLoading}
                          >
                            {isLoading ? "Salvando..." : ptBR.save}
                          </Button>
                        </DialogFooter>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{ptBR.name}</TableHead>
                        <TableHead>{ptBR.description}</TableHead>
                        <TableHead>{ptBR.status}</TableHead>
                        <TableHead className="text-right">{ptBR.actions}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {serviceCategories.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center">{ptBR.noDataAvailable}</TableCell>
                        </TableRow>
                      ) : (
                        serviceCategories.map((category) => (
                          <TableRow key={category.id}>
                            <TableCell className="font-medium">{category.name}</TableCell>
                            <TableCell>{category.description}</TableCell>
                            <TableCell>
                              <Switch
                                checked={category.is_active}
                                onCheckedChange={() => toggleCategoryStatus(category.id, category.is_active)}
                              />
                            </TableCell>
                            <TableCell className="text-right">
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => editServiceCategory(category)}
                              >
                                {ptBR.edit}
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Dias de Funcionamento */}
          <TabsContent value="working-days" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>{ptBR.workingDays}</CardTitle>
                <CardDescription>Configure os dias e horários de funcionamento da clínica</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{ptBR.day}</TableHead>
                        <TableHead>{ptBR.status}</TableHead>
                        <TableHead>{ptBR.workHours}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {workingDays.map((day, index) => (
                        <TableRow key={day.day}>
                          <TableCell className="font-medium">{getDayName(day.day)}</TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <Switch
                                id={`day-status-${day.day}`}
                                checked={day.is_working}
                                onCheckedChange={(checked) => updateWorkingDay(index, 'is_working', checked)}
                              />
                              <Label htmlFor={`day-status-${day.day}`}>
                                {day.is_working ? ptBR.active : ptBR.inactive}
                              </Label>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-2">
                              <div className="grid gap-1">
                                <Label htmlFor={`start-time-${day.day}`}>Início</Label>
                                <Input
                                  id={`start-time-${day.day}`}
                                  type="time"
                                  value={day.start_time}
                                  onChange={(e) => updateWorkingDay(index, 'start_time', e.target.value)}
                                  disabled={!day.is_working}
                                  className="w-24"
                                />
                              </div>
                              <div className="grid gap-1">
                                <Label htmlFor={`end-time-${day.day}`}>Fim</Label>
                                <Input
                                  id={`end-time-${day.day}`}
                                  type="time"
                                  value={day.end_time}
                                  onChange={(e) => updateWorkingDay(index, 'end_time', e.target.value)}
                                  disabled={!day.is_working}
                                  className="w-24"
                                />
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <div className="flex justify-end">
                    <Button 
                      onClick={saveWorkingDays}
                      className="bg-massage-500 hover:bg-massage-600"
                      disabled={isLoading}
                    >
                      {isLoading ? "Salvando..." : ptBR.save}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Perfis de Usuário */}
          <TabsContent value="user-profiles" className="space-y-4">
            <UserPermissions />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
