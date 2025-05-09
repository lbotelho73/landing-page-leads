
import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { UserProfile, UserProfileRole, Permission, RolePermission } from "@/database.types";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle,
  DialogTrigger 
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Shield } from "lucide-react";

export function UserPermissions() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [rolePermissions, setRolePermissions] = useState<Record<UserProfileRole, string[]>>({
    admin: [],
    editor: [],
    viewer: []
  });
  const [selectedRole, setSelectedRole] = useState<UserProfileRole | null>(null);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [savingPermissions, setSavingPermissions] = useState(false);

  useEffect(() => {
    fetchUsers();
    fetchPermissions();
    fetchRolePermissions();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      // Fetch all user profiles
      const { data: profiles, error: profilesError } = await supabase
        .from("user_profiles")
        .select("*");

      if (profilesError) throw profilesError;

      // Type assertion to ensure role is of type UserProfileRole
      const typedProfiles = profiles.map(profile => ({
        ...profile,
        role: profile.role as UserProfileRole
      }));

      setUsers(typedProfiles);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast.error("Falha ao carregar usuários");
    } finally {
      setLoading(false);
    }
  };

  const fetchPermissions = async () => {
    try {
      const { data, error } = await supabase
        .from("permissions")
        .select("*")
        .order("name");

      if (error) throw error;
      
      setPermissions(data || []);
    } catch (error) {
      console.error("Error fetching permissions:", error);
      toast.error("Falha ao carregar permissões");
    }
  };

  const fetchRolePermissions = async () => {
    try {
      const { data, error } = await supabase
        .from("role_permissions")
        .select("*");

      if (error) throw error;
      
      // Group permissions by role
      const grouped: Record<UserProfileRole, string[]> = {
        admin: [],
        editor: [],
        viewer: []
      };
      
      data.forEach(rp => {
        const role = rp.role as UserProfileRole;
        if (grouped[role]) {
          grouped[role].push(rp.permission_id);
        }
      });
      
      setRolePermissions(grouped);
    } catch (error) {
      console.error("Error fetching role permissions:", error);
      toast.error("Falha ao carregar permissões de perfis");
    }
  };

  const handleRoleChange = async (userId: string, newRole: UserProfileRole) => {
    setSaving(userId);
    try {
      // Update the role in the database
      const { error } = await supabase
        .from("user_profiles")
        .update({ role: newRole })
        .eq("id", userId);

      if (error) throw error;

      // Update local state
      setUsers((prev) =>
        prev.map((user) =>
          user.id === userId ? { ...user, role: newRole } : user
        )
      );

      toast.success("Permissão atualizada com sucesso");
    } catch (error) {
      console.error("Error updating role:", error);
      toast.error("Falha ao atualizar permissão");
    } finally {
      setSaving(null);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm("Tem certeza que deseja excluir este usuário?")) {
      return;
    }

    setSaving(userId);
    try {
      // Delete the user profile
      const { error } = await supabase
        .from("user_profiles")
        .delete()
        .eq("id", userId);

      if (error) throw error;

      // Update local state
      setUsers((prev) => prev.filter((user) => user.id !== userId));

      toast.success("Usuário excluído com sucesso");
    } catch (error) {
      console.error("Error deleting user:", error);
      toast.error("Falha ao excluir usuário");
    } finally {
      setSaving(null);
    }
  };

  const handleRolePermissionsOpen = (role: UserProfileRole) => {
    setSelectedRole(role);
    setSelectedPermissions(rolePermissions[role] || []);
  };

  const handlePermissionToggle = (permissionId: string) => {
    setSelectedPermissions(prev => 
      prev.includes(permissionId)
        ? prev.filter(id => id !== permissionId)
        : [...prev, permissionId]
    );
  };

  const saveRolePermissions = async () => {
    if (!selectedRole) return;
    
    setSavingPermissions(true);
    try {
      // Delete existing role permissions
      await supabase
        .from("role_permissions")
        .delete()
        .eq("role", selectedRole);
      
      // Create new role permissions
      if (selectedPermissions.length > 0) {
        const newPermissions = selectedPermissions.map(permissionId => ({
          role: selectedRole,
          permission_id: permissionId
        }));
        
        const { error } = await supabase
          .from("role_permissions")
          .insert(newPermissions);
          
        if (error) throw error;
      }
      
      // Update local state
      setRolePermissions(prev => ({
        ...prev,
        [selectedRole]: [...selectedPermissions]
      }));
      
      toast.success("Permissões do perfil atualizadas com sucesso");
    } catch (error) {
      console.error("Error saving role permissions:", error);
      toast.error("Falha ao salvar permissões do perfil");
    } finally {
      setSavingPermissions(false);
      setSelectedRole(null);
    }
  };

  const formatRoleName = (role: UserProfileRole): string => {
    switch(role) {
      case 'admin': return 'Administrador';
      case 'editor': return 'Editor';
      case 'viewer': return 'Visualizador';
      default: return role;
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Gerenciamento de Permissões</CardTitle>
          <CardDescription>
            Gerencie as permissões de acesso dos usuários
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-4">Carregando usuários...</div>
          ) : users.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground">
              Nenhum usuário encontrado
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Função</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Select
                        value={user.role}
                        onValueChange={(value: UserProfileRole) =>
                          handleRoleChange(user.id, value)
                        }
                        disabled={saving === user.id}
                      >
                        <SelectTrigger className="w-[180px]">
                          <SelectValue placeholder="Selecionar função" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">Administrador</SelectItem>
                          <SelectItem value="editor">Editor</SelectItem>
                          <SelectItem value="viewer">Visualizador</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteUser(user.id)}
                        disabled={saving === user.id}
                      >
                        {saving === user.id ? "Excluindo..." : "Excluir"}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Configuração de Perfis</CardTitle>
          <CardDescription>
            Configure as permissões para cada tipo de perfil
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {(['admin', 'editor', 'viewer'] as UserProfileRole[]).map(role => (
              <Card key={role} className="flex flex-col">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">{formatRoleName(role)}</CardTitle>
                  <CardDescription>
                    {role === 'admin' 
                      ? 'Acesso total ao sistema' 
                      : role === 'editor' 
                        ? 'Pode editar dados mas com restrições' 
                        : 'Apenas visualização'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-grow pb-2">
                  <p className="text-sm text-muted-foreground">
                    {rolePermissions[role]?.length || 0} permissões atribuídas
                  </p>
                </CardContent>
                <CardFooter className="pt-0">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button 
                        variant="outline" 
                        className="w-full"
                        onClick={() => handleRolePermissionsOpen(role)}
                      >
                        <Shield className="mr-2 h-4 w-4" />
                        Configurar Permissões
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px]">
                      <DialogHeader>
                        <DialogTitle>Permissões para {formatRoleName(role)}</DialogTitle>
                        <DialogDescription>
                          Selecione as permissões para este perfil de usuário
                        </DialogDescription>
                      </DialogHeader>
                      
                      <div className="max-h-[300px] overflow-y-auto py-4">
                        {permissions.length === 0 ? (
                          <div className="text-center py-4 text-muted-foreground">
                            Nenhuma permissão disponível
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {permissions.map(permission => (
                              <div key={permission.id} className="flex items-start space-x-3">
                                <Checkbox 
                                  id={`permission-${permission.id}`}
                                  checked={selectedPermissions.includes(permission.id)}
                                  onCheckedChange={() => handlePermissionToggle(permission.id)}
                                />
                                <div>
                                  <Label 
                                    htmlFor={`permission-${permission.id}`}
                                    className="font-medium cursor-pointer"
                                  >
                                    {permission.name}
                                  </Label>
                                  {permission.description && (
                                    <p className="text-sm text-muted-foreground">
                                      {permission.description}
                                    </p>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      
                      <DialogFooter>
                        <Button 
                          onClick={saveRolePermissions} 
                          disabled={savingPermissions || !selectedRole}
                        >
                          {savingPermissions ? "Salvando..." : "Salvar Permissões"}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </CardFooter>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
