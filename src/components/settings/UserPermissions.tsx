
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { UserProfile, Permission } from "@/database.types";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

type Role = "admin" | "editor" | "viewer";

export function UserPermissions() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [rolePermissions, setRolePermissions] = useState<Record<string, string[]>>({
    admin: [],
    editor: [],
    viewer: [],
  });
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserRole, setNewUserRole] = useState<Role>("viewer");
  const [loading, setLoading] = useState(false);
  const [savingPermissions, setSavingPermissions] = useState(false);
  const [initialDataLoaded, setInitialDataLoaded] = useState(false);
  
  // Fetch users and permissions when component mounts
  useEffect(() => {
    fetchUsers();
    fetchPermissions();
  }, []);
  
  const fetchUsers = async () => {
    try {
      console.log("Fetching users...");
      
      // First, try to fetch users from auth.users (requires admin rights)
      try {
        const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
        
        if (!authError && authUsers) {
          console.log("Auth users found:", authUsers);
          
          // Also get user_profiles for additional info
          const { data: profiles } = await supabase
            .from('user_profiles')
            .select('*');
            
          // Create a map of profile data by user ID for quick lookup
          const profileMap = (profiles || []).reduce((acc, profile) => {
            acc[profile.id] = profile;
            return acc;
          }, {} as Record<string, any>);
          
          // Combine auth users with their profiles
          const combinedUsers = authUsers.users.map(user => {
            const profile = profileMap[user.id] || {};
            return {
              id: user.id,
              email: user.email || "",
              role: profile.role || (user.app_metadata?.role as Role) || "viewer",
              created_at: user.created_at
            };
          });
          
          setUsers(combinedUsers);
          return;
        }
      } catch (authError) {
        console.log("Cannot access auth users:", authError);
      }
      
      // Fall back to user_profiles table
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*');
      
      if (error) throw error;
      console.log("Users fetched from user_profiles:", data);
      setUsers(data || []);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast.error("Falha ao carregar usuários");
    }
  };
  
  const fetchPermissions = async () => {
    try {
      console.log("Fetching permissions...");
      // Fetch permissions from the database
      const { data: permissionsData, error: permissionsError } = await supabase
        .from('permissions')
        .select('*')
        .order('name');
      
      if (permissionsError) throw permissionsError;
      
      setPermissions(permissionsData || []);
      console.log("Permissions fetched:", permissionsData);
      
      // Fetch role permissions
      const { data: rolePermData, error: rolePermError } = await supabase
        .from('role_permissions')
        .select('*');
      
      if (rolePermError) throw rolePermError;
      console.log("Role permissions fetched:", rolePermData);
      
      // Structure role permissions
      const adminPerms: string[] = [];
      const editorPerms: string[] = [];
      const viewerPerms: string[] = [];
      
      rolePermData?.forEach(item => {
        if (item.role === 'admin') adminPerms.push(item.permission_id);
        else if (item.role === 'editor') editorPerms.push(item.permission_id);
        else if (item.role === 'viewer') viewerPerms.push(item.permission_id);
      });
      
      setRolePermissions({
        admin: adminPerms,
        editor: editorPerms,
        viewer: viewerPerms
      });
      
      setInitialDataLoaded(true);
      
    } catch (error) {
      console.error("Error fetching permissions:", error);
      toast.error("Falha ao carregar permissões");
    }
  };
  
  const addUser = async () => {
    if (!newUserEmail || !newUserRole) {
      toast.warning("Email e cargo são obrigatórios");
      return;
    }
    
    setLoading(true);
    try {
      // Check if the user already exists in user_profiles
      const { data: existingUser, error: checkError } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('email', newUserEmail)
        .single();
        
      if (!checkError && existingUser) {
        toast.warning("Este email já está registrado");
        setLoading(false);
        return;
      }
      
      // Create new user in the database
      const { data, error } = await supabase
        .from('user_profiles')
        .insert({
          email: newUserEmail,
          role: newUserRole
        })
        .select();
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        setUsers(prev => [...prev, data[0]]);
        toast.success("Usuário adicionado com sucesso");
        setNewUserEmail("");
        setNewUserRole("viewer");
      }
    } catch (error: any) {
      console.error("Error adding user:", error);
      
      if (error.code === '23505') { // Unique constraint violation
        toast.error("Este email já está registrado");
      } else {
        toast.error("Falha ao adicionar usuário");
      }
    } finally {
      setLoading(false);
    }
  };

  const togglePermission = (role: Role, permissionId: string) => {
    setRolePermissions(prev => {
      const newPermissions = { ...prev };
      
      if (newPermissions[role].includes(permissionId)) {
        // Remove permission
        newPermissions[role] = newPermissions[role].filter(id => id !== permissionId);
      } else {
        // Add permission
        newPermissions[role] = [...newPermissions[role], permissionId];
      }
      
      return newPermissions;
    });
  };
  
  const savePermissions = async () => {
    setSavingPermissions(true);
    try {
      console.log("Saving permissions:", rolePermissions);
      
      // First, delete existing role permissions
      const { error: deleteError } = await supabase
        .from('role_permissions')
        .delete()
        .gte('id', '');
      
      if (deleteError) {
        console.error("Error deleting existing permissions:", deleteError);
        throw deleteError;
      }
      
      // Then insert new permissions for each role
      const rolesToInsert = [];
      
      // Admin permissions
      for (const permId of rolePermissions.admin) {
        rolesToInsert.push({ role: 'admin', permission_id: permId });
      }
      
      // Editor permissions
      for (const permId of rolePermissions.editor) {
        rolesToInsert.push({ role: 'editor', permission_id: permId });
      }
      
      // Viewer permissions
      for (const permId of rolePermissions.viewer) {
        rolesToInsert.push({ role: 'viewer', permission_id: permId });
      }
      
      console.log("Inserting role permissions:", rolesToInsert);
      
      if (rolesToInsert.length > 0) {
        const { data, error: insertError } = await supabase
          .from('role_permissions')
          .insert(rolesToInsert)
          .select();
        
        if (insertError) {
          console.error("Error inserting permissions:", insertError);
          throw insertError;
        }
        
        console.log("Inserted permissions:", data);
      }
      
      // Now update all user profile roles to match their role-specific permissions
      await updateUserRoles();
      
      toast.success("Permissões salvas com sucesso");
    } catch (error) {
      console.error("Error saving permissions:", error);
      toast.error("Falha ao salvar permissões");
    } finally {
      setSavingPermissions(false);
    }
  };
  
  // Função para atualizar os papéis dos usuários no banco de dados auth
  const updateUserRoles = async () => {
    try {
      // Para cada usuário, atualize suas permissões específicas de papel
      for (const user of users) {
        if (!user.role) continue;
        
        const userRole = user.role;
        console.log(`Atualizando permissões para o usuário ${user.email} com papel ${userRole}`);
        
        // Tentar atualizar permissões em auth.users se tivermos acesso
        try {
          const { error: authError } = await supabase.auth.admin.updateUserById(
            user.id, 
            { app_metadata: { role: userRole } }
          );
          
          if (!authError) {
            console.log(`Permissões atualizadas para o usuário ${user.email} em auth.users`);
          } else {
            console.error(`Erro ao atualizar permissões em auth.users:`, authError);
            
            // Atualizar no user_profiles como fallback
            const { error: userProfileError } = await supabase
              .from('user_profiles')
              .update({ role: userRole })
              .eq('id', user.id);
              
            if (userProfileError) {
              console.error(`Erro ao atualizar permissões em user_profiles:`, userProfileError);
            }
          }
        } catch (authError) {
          console.log("Não é possível atualizar funções de usuários auth:", authError);
          
          // Atualizar no user_profiles como fallback
          const { error: userProfileError } = await supabase
            .from('user_profiles')
            .update({ role: userRole })
            .eq('id', user.id);
            
          if (userProfileError) {
            console.error(`Erro ao atualizar permissões em user_profiles:`, userProfileError);
          }
        }
      }
    } catch (error) {
      console.error("Erro ao atualizar funções de usuários:", error);
      throw error;
    }
  };
  
  const changeUserRole = async (userId: string, newRole: Role) => {
    try {
      // Primeiro tenta atualizar o usuário autenticado
      try {
        const { error: authError } = await supabase.auth.admin.updateUserById(
          userId, 
          { app_metadata: { role: newRole } }
        );
        
        if (!authError) {
          // Atualize o estado local após sucesso
          setUsers(prev => prev.map(u => 
            u.id === userId ? {...u, role: newRole} : u
          ));
          toast.success("Papel do usuário atualizado com sucesso");
          return;
        }
      } catch (authError) {
        console.log("Não é possível atualizar o usuário auth:", authError);
      }
      
      // Fallback para user_profiles
      const { error: profileError } = await supabase
        .from('user_profiles')
        .update({ role: newRole })
        .eq('id', userId);
      
      if (profileError) throw profileError;
      
      // Atualize o estado local após sucesso
      setUsers(prev => prev.map(u => 
        u.id === userId ? {...u, role: newRole} : u
      ));
      
      toast.success("Papel do usuário atualizado com sucesso");
    } catch (error) {
      console.error("Erro ao atualizar papel do usuário:", error);
      toast.error("Falha ao atualizar papel do usuário");
    }
  };
  
  const deleteUser = async (userId: string) => {
    try {
      // Primeiro tenta excluir o usuário autenticado
      try {
        const { error: authError } = await supabase.auth.admin.deleteUser(userId);
        
        if (!authError) {
          setUsers(prev => prev.filter(user => user.id !== userId));
          toast.success("Usuário removido com sucesso");
          return;
        }
      } catch (authError) {
        console.log("Não é possível excluir o usuário auth:", authError);
      }
      
      // Fallback para user_profiles
      const { error } = await supabase
        .from('user_profiles')
        .delete()
        .eq('id', userId);
      
      if (error) throw error;
      
      setUsers(prev => prev.filter(user => user.id !== userId));
      toast.success("Usuário removido com sucesso");
    } catch (error) {
      console.error("Erro ao excluir usuário:", error);
      toast.error("Falha ao remover usuário");
    }
  };
  
  return (
    <>
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Adicionar Usuário</CardTitle>
          <CardDescription>Adicione usuários ao sistema e defina seus níveis de acesso</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input 
              placeholder="Email do usuário" 
              value={newUserEmail} 
              onChange={(e) => setNewUserEmail(e.target.value)} 
              className="col-span-1 md:col-span-2"
            />
            <Select value={newUserRole} onValueChange={(value: Role) => setNewUserRole(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um cargo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Administrador</SelectItem>
                <SelectItem value="editor">Editor</SelectItem>
                <SelectItem value="viewer">Visualizador</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button 
            className="mt-4"
            onClick={addUser}
            disabled={loading || !newUserEmail || !newUserRole}
          >
            {loading ? "Adicionando..." : "Adicionar Usuário"}
          </Button>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Usuários do Sistema</CardTitle>
          <CardDescription>Usuários que têm acesso ao sistema</CardDescription>
        </CardHeader>
        <CardContent>
          {users.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground">
              Nenhum usuário registrado
            </div>
          ) : (
            <div className="space-y-4">
              {users.map((user) => (
                <div key={user.id} className="flex items-center justify-between border-b pb-2">
                  <div>
                    <p className="font-medium">{user.email}</p>
                    <div className="text-sm flex items-center gap-2">
                      <Badge 
                        variant={
                          user.role === 'admin' ? 'default' : 
                          user.role === 'editor' ? 'secondary' : 
                          'outline'
                        }
                      >
                        {user.role === 'admin' ? 'Administrador' : 
                         user.role === 'editor' ? 'Editor' : 'Visualizador'}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Select 
                      value={user.role || "viewer"} 
                      onValueChange={(value: Role) => changeUserRole(user.id, value)}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Administrador</SelectItem>
                        <SelectItem value="editor">Editor</SelectItem>
                        <SelectItem value="viewer">Visualizador</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => deleteUser(user.id)}
                    >
                      Remover
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Permissões por Cargo</CardTitle>
          <CardDescription>Defina quais permissões cada cargo terá</CardDescription>
        </CardHeader>
        <CardContent>
          {!initialDataLoaded ? (
            <div className="flex justify-center py-4">
              <Alert>
                <AlertDescription>
                  Carregando permissões...
                </AlertDescription>
              </Alert>
            </div>
          ) : (
            <>
              <div className="mb-4 overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      <th className="text-left py-2 px-4">Permissão</th>
                      <th className="text-center py-2 px-4">Administrador</th>
                      <th className="text-center py-2 px-4">Editor</th>
                      <th className="text-center py-2 px-4">Visualizador</th>
                    </tr>
                  </thead>
                  <tbody>
                    {permissions.map((permission) => (
                      <tr key={permission.id} className="border-t">
                        <td className="py-2 px-4">
                          <p className="font-medium">{permission.name}</p>
                          <p className="text-sm text-muted-foreground">{permission.description}</p>
                        </td>
                        <td className="text-center py-2 px-4">
                          <Checkbox
                            checked={rolePermissions.admin.includes(permission.id)}
                            onCheckedChange={() => togglePermission('admin', permission.id)}
                          />
                        </td>
                        <td className="text-center py-2 px-4">
                          <Checkbox 
                            checked={rolePermissions.editor.includes(permission.id)}
                            onCheckedChange={() => togglePermission('editor', permission.id)}
                          />
                        </td>
                        <td className="text-center py-2 px-4">
                          <Checkbox 
                            checked={rolePermissions.viewer.includes(permission.id)}
                            onCheckedChange={() => togglePermission('viewer', permission.id)}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Button 
                onClick={savePermissions} 
                disabled={savingPermissions}
                className="bg-massage-500 hover:bg-massage-600"
              >
                {savingPermissions ? "Salvando..." : "Salvar Permissões"}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </>
  );
}
