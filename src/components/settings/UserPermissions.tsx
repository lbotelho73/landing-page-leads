
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
import { UserProfile, UserProfileRole, Permission } from "@/database.types";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { AlertCircle, Shield, RefreshCw, Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function UserPermissions() {
  // State variables
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
  const [syncingUsers, setSyncingUsers] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Fetch data when component mounts
  useEffect(() => {
    fetchUsers();
    fetchPermissions();
    fetchRolePermissions();
  }, []);

  // Fetch users from the user_profiles table
  const fetchUsers = async () => {
    setLoading(true);
    try {
      console.log("Fetching user profiles");
      
      // First, sync users from auth.users to user_profiles to ensure we have up-to-date data
      // Use the stored procedure to ensure this is done correctly
      const syncResponse = await supabase.rpc('sync_users_to_profiles');
      if (syncResponse.error) {
        console.error("Error syncing users:", syncResponse.error);
      } else {
        console.log("User sync completed");
      }
      
      // Now fetch the user profiles
      const { data: profiles, error: profilesError } = await supabase
        .from("user_profiles")
        .select("*")
        .order('email');

      if (profilesError) throw profilesError;

      // Type assertion for role
      const typedProfiles = profiles.map(profile => ({
        ...profile,
        role: (profile.role || "viewer") as UserProfileRole
      }));

      console.log("Fetched user profiles:", typedProfiles);
      setUsers(typedProfiles);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast.error("Falha ao carregar usuários");
    } finally {
      setLoading(false);
    }
  };

  // Fetch all permissions
  const fetchPermissions = async () => {
    try {
      const { data, error } = await supabase
        .from("permissions")
        .select("*")
        .order("name");

      if (error) throw error;
      
      console.log("Fetched permissions:", data);
      setPermissions(data || []);
    } catch (error) {
      console.error("Error fetching permissions:", error);
      toast.error("Falha ao carregar permissões");
    }
  };

  // Fetch role-permission mappings
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
      
      if (data) {
        data.forEach(rp => {
          const role = rp.role as UserProfileRole;
          if (grouped[role]) {
            grouped[role].push(rp.permission_id);
          }
        });
      }
      
      console.log("Fetched role permissions:", grouped);
      setRolePermissions(grouped);
    } catch (error) {
      console.error("Error fetching role permissions:", error);
      toast.error("Falha ao carregar permissões de perfis");
    }
  };

  // Update user role
  const handleRoleChange = async (userId: string, newRole: UserProfileRole) => {
    setSaving(userId);
    try {
      console.log(`Updating role for user ${userId} to ${newRole}`);
      
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

  // Delete user profile
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

  // Open role permissions dialog
  const handleRolePermissionsOpen = (role: UserProfileRole) => {
    setSelectedRole(role);
    setSelectedPermissions(rolePermissions[role] || []);
    setDialogOpen(true);
  };

  // Toggle permission selection
  const handlePermissionToggle = (permissionId: string) => {
    setSelectedPermissions(prev => 
      prev.includes(permissionId)
        ? prev.filter(id => id !== permissionId)
        : [...prev, permissionId]
    );
  };

  // Save role permissions
  const saveRolePermissions = async () => {
    if (!selectedRole) return;
    
    setSavingPermissions(true);
    try {
      console.log(`Saving permissions for role ${selectedRole}:`, selectedPermissions);
      
      // Delete existing role permissions
      const { error: deleteError } = await supabase
        .from("role_permissions")
        .delete()
        .eq("role", selectedRole);
        
      if (deleteError) {
        console.error("Error deleting existing role permissions:", deleteError);
        throw deleteError;
      }
      
      // Create new role permissions
      if (selectedPermissions.length > 0) {
        const newPermissions = selectedPermissions.map(permissionId => ({
          role: selectedRole,
          permission_id: permissionId
        }));
        
        console.log("Inserting new role permissions:", newPermissions);
        
        const { error } = await supabase
          .from("role_permissions")
          .insert(newPermissions);
          
        if (error) {
          console.error("Error inserting role permissions:", error);
          throw error;
        }
      }
      
      // Update local state
      setRolePermissions(prev => ({
        ...prev,
        [selectedRole]: [...selectedPermissions]
      }));
      
      toast.success("Permissões do perfil atualizadas com sucesso");
      setDialogOpen(false);
    } catch (error: any) {
      console.error("Error saving role permissions:", error);
      toast.error(`Falha ao salvar permissões do perfil: ${error.message || String(error)}`);
    } finally {
      setSavingPermissions(false);
    }
  };

  // Synchronize users from auth.users to user_profiles
  const handleSyncUsers = async () => {
    setSyncingUsers(true);
    setSyncError(null);
    
    try {
      console.log("Starting user synchronization...");
      
      // Call the stored function to sync users
      const { data, error } = await supabase.rpc('sync_users_to_profiles');
      
      if (error) {
        throw error;
      }
      
      toast.success("Usuários sincronizados com sucesso");
      // Refresh the user list
      fetchUsers();
    } catch (error: any) {
      const errorMessage = error.message || "Erro ao sincronizar usuários";
      setSyncError(errorMessage);
      toast.error(errorMessage);
      console.error("Error syncing users:", error);
    } finally {
      setSyncingUsers(false);
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
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Gerenciamento de Permissões</CardTitle>
            <CardDescription>
              Gerencie as permissões de acesso dos usuários
            </CardDescription>
          </div>
          <Button 
            onClick={handleSyncUsers}
            variant="outline"
            className="flex items-center"
            disabled={syncingUsers}
          >
            {syncingUsers ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sincronizando...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Sincronizar Usuários
              </>
            )}
          </Button>
        </CardHeader>
        <CardContent>
          {syncError && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {syncError}
              </AlertDescription>
            </Alert>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">Carregando usuários...</span>
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground">
              Nenhum usuário encontrado. Clique em "Sincronizar Usuários" para importar usuários do sistema de autenticação.
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
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => handleRolePermissionsOpen(role)}
                  >
                    <Shield className="mr-2 h-4 w-4" />
                    Configurar Permissões
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
      
      {/* Role permissions dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Permissões para {selectedRole ? formatRoleName(selectedRole) : ''}</DialogTitle>
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
              {savingPermissions ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : "Salvar Permissões"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
