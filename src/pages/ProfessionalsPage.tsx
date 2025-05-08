import { useState, useEffect } from 'react';
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import type { Professional } from "@/lib/supabase";
import ptBR from "@/lib/i18n";

// Update the ProfessionalWithSchedules interface to match the Professional type
interface ProfessionalWithSchedules extends Professional {
  schedules?: {
    day_of_week: string;
    start_time: string;
    end_time: string;
    id: string;
  }[];
}

export default function ProfessionalsPage() {
  const [professionals, setProfessionals] = useState<ProfessionalWithSchedules[]>([]);
  const [loading, setLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [professionalToDelete, setProfessionalToDelete] = useState<ProfessionalWithSchedules | null>(null);
  
  // Estados para o formulário
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [aliasName, setAliasName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [commissionPercentage, setCommissionPercentage] = useState('40');
  const [isActive, setIsActive] = useState(true);
  const [notes, setNotes] = useState('');
  const [editMode, setEditMode] = useState(false);
  const [currentId, setCurrentId] = useState<string | null>(null);
  
  // States for schedule
  const [workDays, setWorkDays] = useState<{
    day: string;
    active: boolean;
    startTime: string;
    endTime: string;
    id?: string;
  }[]>([
    { day: 'monday', active: true, startTime: '09:00', endTime: '18:00' },
    { day: 'tuesday', active: true, startTime: '09:00', endTime: '18:00' },
    { day: 'wednesday', active: true, startTime: '09:00', endTime: '18:00' },
    { day: 'thursday', active: true, startTime: '09:00', endTime: '18:00' },
    { day: 'friday', active: true, startTime: '09:00', endTime: '18:00' },
    { day: 'saturday', active: true, startTime: '10:00', endTime: '16:00' },
    { day: 'sunday', active: false, startTime: '10:00', endTime: '16:00' }
  ]);
  
  useEffect(() => {
    fetchProfessionals();
  }, []);
  
  const fetchProfessionals = async () => {
    setLoading(true);
    try {
      const { data: professionalsData, error: professionalsError } = await supabase
        .from('professionals')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (professionalsError) throw professionalsError;
      
      // Buscar agendas para cada profissional
      const professionalList = professionalsData || [];
      const enhancedProfessionals = await Promise.all(
        professionalList.map(async (prof) => {
          const { data: schedules, error: scheduleError } = await supabase
            .from('professional_schedules')
            .select('*')
            .eq('professional_id', prof.id);
          
          if (scheduleError) {
            console.error('Erro ao buscar agenda:', scheduleError);
            return { ...prof, schedules: [] };
          }
          
          return { ...prof, schedules: schedules || [] };
        })
      );
      
      setProfessionals(enhancedProfessionals);
    } catch (error) {
      console.error('Erro ao carregar profissionais:', error);
      toast.error('Falha ao carregar lista de profissionais');
    } finally {
      setLoading(false);
    }
  };
  
  const resetForm = () => {
    setFirstName('');
    setLastName('');
    setAliasName('');
    setEmail('');
    setPhone('');
    setCommissionPercentage('40');
    setIsActive(true);
    setNotes('');
    setEditMode(false);
    setCurrentId(null);
    // Reset work days
    setWorkDays([
      { day: 'monday', active: true, startTime: '09:00', endTime: '18:00' },
      { day: 'tuesday', active: true, startTime: '09:00', endTime: '18:00' },
      { day: 'wednesday', active: true, startTime: '09:00', endTime: '18:00' },
      { day: 'thursday', active: true, startTime: '09:00', endTime: '18:00' },
      { day: 'friday', active: true, startTime: '09:00', endTime: '18:00' },
      { day: 'saturday', active: true, startTime: '10:00', endTime: '16:00' },
      { day: 'sunday', active: false, startTime: '10:00', endTime: '16:00' }
    ]);
  };
  
  const handleEdit = (professional: ProfessionalWithSchedules) => {
    setEditMode(true);
    setCurrentId(professional.id);
    setFirstName(professional.first_name);
    setLastName(professional.last_name);
    setAliasName(professional.alias_name || '');
    setEmail(professional.email || '');
    setPhone(professional.phone || '');
    setCommissionPercentage(professional.commission_percentage.toString());
    setIsActive(professional.is_active);
    setNotes(professional.notes || '');
    
    // Set work days
    if (professional.schedules && professional.schedules.length > 0) {
      const updatedWorkDays = [...workDays];
      professional.schedules.forEach(schedule => {
        const dayIndex = updatedWorkDays.findIndex(day => day.day === schedule.day_of_week);
        if (dayIndex !== -1) {
          updatedWorkDays[dayIndex] = {
            ...updatedWorkDays[dayIndex],
            active: true,
            startTime: schedule.start_time,
            endTime: schedule.end_time,
            id: schedule.id
          };
        }
      });
      setWorkDays(updatedWorkDays);
    }
    
    setIsDialogOpen(true);
  };
  
  const handleDelete = (professional: ProfessionalWithSchedules) => {
    setProfessionalToDelete(professional);
    setIsDeleteDialogOpen(true);
  };
  
  const confirmDelete = async () => {
    if (!professionalToDelete) return;
    
    try {
      // Excluir a agenda do profissional primeiro
      await supabase
        .from('professional_schedules')
        .delete()
        .eq('professional_id', professionalToDelete.id);
      
      // Em seguida excluir o profissional
      const { error } = await supabase
        .from('professionals')
        .delete()
        .eq('id', professionalToDelete.id);
      
      if (error) throw error;
      
      toast.success('Profissional excluído com sucesso');
      fetchProfessionals(); // Recarregar a lista
      setIsDeleteDialogOpen(false);
      setProfessionalToDelete(null);
    } catch (error) {
      console.error('Erro ao excluir profissional:', error);
      toast.error('Falha ao excluir profissional');
    }
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const professionalData = {
        first_name: firstName,
        last_name: lastName,
        alias_name: aliasName,
        email: email || null,
        phone: phone || null,
        commission_percentage: parseInt(commissionPercentage),
        is_active: isActive,
        notes: notes || null
      };
      
      if (editMode && currentId) {
        // Update existing professional
        const { error } = await supabase
          .from('professionals')
          .update(professionalData)
          .eq('id', currentId);
        
        if (error) throw error;
        
        // Update schedules
        for (const day of workDays) {
          if (day.active) {
            const scheduleData = {
              professional_id: currentId,
              day_of_week: day.day,
              start_time: day.startTime,
              end_time: day.endTime
            };
            
            if (day.id) {
              // Update existing schedule
              await supabase
                .from('professional_schedules')
                .update({
                  start_time: day.startTime,
                  end_time: day.endTime
                })
                .eq('id', day.id);
            } else {
              // Insert new schedule
              await supabase
                .from('professional_schedules')
                .insert([scheduleData]);
            }
          } else if (day.id) {
            // Delete schedule if day is inactive but has an id
            await supabase
              .from('professional_schedules')
              .delete()
              .eq('id', day.id);
          }
        }
        
        toast.success('Profissional atualizado com sucesso');
      } else {
        // Create new professional
        const { data, error } = await supabase
          .from('professionals')
          .insert([professionalData])
          .select();
        
        if (error) throw error;
        
        const newProfId = data?.[0]?.id;
        
        // Create schedules for active days
        if (newProfId) {
          for (const day of workDays.filter(d => d.active)) {
            await supabase
              .from('professional_schedules')
              .insert([{
                professional_id: newProfId,
                day_of_week: day.day,
                start_time: day.startTime,
                end_time: day.endTime
              }]);
          }
        }
        
        toast.success('Profissional cadastrado com sucesso');
      }
      
      fetchProfessionals(); // Refresh the list
      setIsDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error('Erro ao salvar profissional:', error);
      toast.error('Falha ao salvar profissional');
    } finally {
      setLoading(false);
    }
  };
  
  const updateWorkDay = (index: number, field: string, value: any) => {
    const newWorkDays = [...workDays];
    newWorkDays[index] = { ...newWorkDays[index], [field]: value };
    setWorkDays(newWorkDays);
  };
  
  const getDayName = (day: string) => {
    const days: {[key: string]: string} = {
      'monday': 'Segunda-feira',
      'tuesday': 'Terça-feira',
      'wednesday': 'Quarta-feira',
      'thursday': 'Quinta-feira',
      'friday': 'Sexta-feira',
      'saturday': 'Sábado',
      'sunday': 'Domingo'
    };
    return days[day] || day;
  };
  
  return (
    <AppLayout>
      <div className="page-container">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">{ptBR.professionals}</h1>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-massage-500 hover:bg-massage-600" onClick={resetForm}>
                {ptBR.addProfessional}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
              <form onSubmit={handleSubmit}>
                <DialogHeader>
                  <DialogTitle>
                    {editMode ? "Editar Profissional" : ptBR.addProfessional}
                  </DialogTitle>
                  <DialogDescription>
                    {ptBR.professionalDetails}
                  </DialogDescription>
                </DialogHeader>
                <Tabs defaultValue="details" className="mt-4">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="details">Detalhes Pessoais</TabsTrigger>
                    <TabsTrigger value="schedule">{ptBR.schedule}</TabsTrigger>
                  </TabsList>
                  <TabsContent value="details" className="space-y-4 py-4">
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
                      <Label htmlFor="aliasName">{ptBR.alias}</Label>
                      <Input 
                        id="aliasName" 
                        value={aliasName} 
                        onChange={(e) => setAliasName(e.target.value)} 
                        placeholder="Nome artístico ou apelido (opcional)" 
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="email">Email</Label>
                        <Input 
                          id="email" 
                          type="email" 
                          value={email} 
                          onChange={(e) => setEmail(e.target.value)} 
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="phone">{ptBR.phone}</Label>
                        <Input 
                          id="phone" 
                          type="tel" 
                          value={phone} 
                          onChange={(e) => setPhone(e.target.value)} 
                        />
                      </div>
                    </div>
                    
                    <div className="grid gap-2">
                      <Label htmlFor="commission">{ptBR.commissionPercentage}</Label>
                      <div className="flex">
                        <Input 
                          id="commission" 
                          type="number" 
                          min="0" 
                          max="100" 
                          value={commissionPercentage} 
                          onChange={(e) => setCommissionPercentage(e.target.value)} 
                          className="w-24" 
                          required 
                        />
                        <span className="ml-2 flex items-center">%</span>
                      </div>
                    </div>
                    
                    <div className="grid gap-2">
                      <Label htmlFor="notes">{ptBR.notes}</Label>
                      <Textarea 
                        id="notes" 
                        value={notes} 
                        onChange={(e) => setNotes(e.target.value)} 
                        placeholder="Observações adicionais" 
                      />
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Switch 
                        id="isActive" 
                        checked={isActive} 
                        onCheckedChange={setIsActive} 
                      />
                      <Label htmlFor="isActive">{isActive ? ptBR.active : ptBR.inactive}</Label>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="schedule" className="space-y-4 py-4">
                    <div className="space-y-4">
                      <div className="text-sm text-muted-foreground">
                        Configure os dias e horários de disponibilidade da profissional:
                      </div>
                      {workDays.map((day, index) => (
                        <div key={day.day} className="flex flex-wrap items-center gap-4 py-2 border-b">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              <Switch 
                                id={`day-${day.day}`} 
                                checked={day.active} 
                                onCheckedChange={(checked) => updateWorkDay(index, 'active', checked)}
                              />
                              <Label htmlFor={`day-${day.day}`} className="min-w-[100px]">
                                {getDayName(day.day)}
                              </Label>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="grid gap-1">
                              <Label htmlFor={`start-${day.day}`} className="text-xs">Início</Label>
                              <Input
                                id={`start-${day.day}`}
                                type="time"
                                value={day.startTime}
                                onChange={(e) => updateWorkDay(index, 'startTime', e.target.value)}
                                disabled={!day.active}
                                className="w-24"
                              />
                            </div>
                            <div className="grid gap-1">
                              <Label htmlFor={`end-${day.day}`} className="text-xs">Fim</Label>
                              <Input
                                id={`end-${day.day}`}
                                type="time"
                                value={day.endTime}
                                onChange={(e) => updateWorkDay(index, 'endTime', e.target.value)}
                                disabled={!day.active}
                                className="w-24"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </TabsContent>
                </Tabs>
                <DialogFooter className="mt-4">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    {ptBR.cancel}
                  </Button>
                  <Button 
                    type="submit" 
                    className="bg-massage-500 hover:bg-massage-600"
                    disabled={loading}
                  >
                    {loading ? "Salvando..." : ptBR.save}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle>Lista de Profissionais</CardTitle>
            <CardDescription>Gerencie as profissionais da clínica</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-4">{ptBR.loadingData}</div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{ptBR.name}</TableHead>
                      <TableHead>{ptBR.alias}</TableHead>
                      <TableHead>{ptBR.phone}</TableHead>
                      <TableHead>{ptBR.commissionPercentage}</TableHead>
                      <TableHead>{ptBR.status}</TableHead>
                      <TableHead className="text-right">{ptBR.actions}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {professionals.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center">Nenhum profissional cadastrado</TableCell>
                      </TableRow>
                    ) : (
                      professionals.map((professional) => (
                        <TableRow key={professional.id} className={!professional.is_active ? "bg-muted/50" : ""}>
                          <TableCell className="font-medium">
                            {professional.first_name} {professional.last_name}
                          </TableCell>
                          <TableCell>
                            {professional.alias_name || '-'}
                          </TableCell>
                          <TableCell>{professional.phone || '-'}</TableCell>
                          <TableCell>{professional.commission_percentage}%</TableCell>
                          <TableCell>
                            <div className={`inline-block px-2 py-1 text-xs rounded-full ${
                              professional.is_active 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {professional.is_active ? ptBR.active : ptBR.inactive}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => handleEdit(professional)}
                              >
                                {ptBR.edit}
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => handleDelete(professional)}
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
        
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
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
                onClick={confirmDelete}
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
