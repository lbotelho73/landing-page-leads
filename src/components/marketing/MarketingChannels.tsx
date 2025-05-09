import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Check, Pencil, Trash2, X } from "lucide-react";
import { BulkDeleteButton } from "@/components/data/BulkDeleteButton";

interface MarketingChannel {
  id: string;
  name: string;
  description: string;
  is_active: boolean;
}

export function MarketingChannels() {
  const [channels, setChannels] = useState<MarketingChannel[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [editMode, setEditMode] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [adding, setAdding] = useState(false);
  const [showInactive, setShowInactive] = useState(false);

  const fetchChannels = async () => {
    try {
      let query = supabase.from('marketing_channels').select('*');
      
      if (!showInactive) {
        query = query.eq('is_active', true);
      }
      
      const { data, error } = await query.order('name');
      
      if (error) throw error;
      setChannels(data || []);
    } catch (error) {
      console.error('Error fetching marketing channels:', error);
      toast.error('Falha ao carregar canais de marketing');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChannels();
  }, [showInactive]);

  const addChannel = async () => {
    if (!newName.trim()) {
      toast.warning('O nome do canal é obrigatório');
      return;
    }

    setAdding(true);
    try {
      const { data, error } = await supabase
        .from('marketing_channels')
        .insert([
          { 
            name: newName.trim(),
            description: newDescription.trim(),
            is_active: true
          }
        ])
        .select();

      if (error) throw error;
      toast.success('Canal adicionado com sucesso');
      setNewName("");
      setNewDescription("");
      fetchChannels();
    } catch (error) {
      console.error('Error adding marketing channel:', error);
      toast.error('Falha ao adicionar canal');
    } finally {
      setAdding(false);
    }
  };

  const startEdit = (channel: MarketingChannel) => {
    setEditMode(channel.id);
    setEditName(channel.name);
    setEditDescription(channel.description || '');
  };

  const cancelEdit = () => {
    setEditMode(null);
  };

  const saveEdit = async (id: string) => {
    if (!editName.trim()) {
      toast.warning('O nome do canal é obrigatório');
      return;
    }

    try {
      const { error } = await supabase
        .from('marketing_channels')
        .update({ 
          name: editName.trim(), 
          description: editDescription.trim() 
        })
        .eq('id', id);

      if (error) throw error;
      toast.success('Canal atualizado com sucesso');
      setEditMode(null);
      fetchChannels();
    } catch (error) {
      console.error('Error updating marketing channel:', error);
      toast.error('Falha ao atualizar canal');
    }
  };

  const toggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('marketing_channels')
        .update({ is_active: !currentStatus })
        .eq('id', id);

      if (error) throw error;
      toast.success(currentStatus ? 'Canal desativado' : 'Canal ativado');
      fetchChannels();
    } catch (error) {
      console.error('Error toggling channel status:', error);
      toast.error('Falha ao atualizar status do canal');
    }
  };

  const deleteChannel = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este canal? Esta ação não pode ser desfeita.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('marketing_channels')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Canal excluído com sucesso');
      fetchChannels();
    } catch (error) {
      console.error('Error deleting marketing channel:', error);
      toast.error('Falha ao excluir canal');
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Novo Canal de Marketing</CardTitle>
          <CardDescription>Adicione um novo canal para rastrear a origem dos clientes</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Nome</label>
              <Input
                placeholder="Ex: Google Ads, Instagram, Indicação"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Descrição (opcional)</label>
              <Textarea
                placeholder="Detalhes adicionais sobre o canal"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                rows={3}
              />
            </div>
            <Button 
              onClick={addChannel} 
              disabled={adding || !newName.trim()}
              className="w-full"
            >
              {adding ? "Adicionando..." : "Adicionar Canal"}
            </Button>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Canais de Marketing</CardTitle>
            <CardDescription>Gerencie os canais de marketing disponíveis</CardDescription>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-sm">Mostrar inativos</span>
            <Switch 
              checked={showInactive} 
              onCheckedChange={setShowInactive} 
            />
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-4">Carregando canais...</div>
          ) : channels.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground">
              Nenhum canal de marketing encontrado
            </div>
          ) : (
            <>
              <div className="mb-4">
                <BulkDeleteButton
                  tableName="marketing_channels"
                  onSuccess={fetchChannels}
                  buttonText="Exclusão em Lote"
                  buttonVariant="outline"
                />
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {channels.map((channel) => (
                    <TableRow key={channel.id}>
                      <TableCell>
                        {editMode === channel.id ? (
                          <Input 
                            value={editName} 
                            onChange={(e) => setEditName(e.target.value)} 
                          />
                        ) : (
                          channel.name
                        )}
                      </TableCell>
                      <TableCell>
                        {editMode === channel.id ? (
                          <Input 
                            value={editDescription} 
                            onChange={(e) => setEditDescription(e.target.value)}
                          />
                        ) : (
                          channel.description || "-"
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          variant={channel.is_active ? "default" : "outline"}
                          size="sm"
                          onClick={() => toggleActive(channel.id, channel.is_active)}
                        >
                          {channel.is_active ? "Ativo" : "Inativo"}
                        </Button>
                      </TableCell>
                      <TableCell className="text-right">
                        {editMode === channel.id ? (
                          <div className="flex justify-end space-x-2">
                            <Button
                              size="icon"
                              variant="outline"
                              onClick={cancelEdit}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              onClick={() => saveEdit(channel.id)}
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex justify-end space-x-2">
                            <Button
                              size="icon"
                              variant="outline"
                              onClick={() => startEdit(channel)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="destructive"
                              onClick={() => deleteChannel(channel.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
