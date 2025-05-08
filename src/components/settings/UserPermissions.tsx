
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

type Role = "admin" | "editor" | "viewer";

interface User {
  id: string;
  email: string;
  role: Role;
}

interface Permission {
  id: string;
  name: string;
  description: string;
  adminDefault: boolean;
  editorDefault: boolean;
  viewerDefault: boolean;
}

export function UserPermissions() {
  const [users, setUsers] = useState<User[]>([]);
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
  
  // Fetch users and permissions when component mounts
  useEffect(() => {
    fetchUsers();
    fetchPermissions();
  }, []);
  
  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('id, email, role');
      
      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast.error("Falha ao carregar usuários");
    }
  };
  
  const fetchPermissions = async () => {
    try {
      // Fetch permissions
      const { data: permissionsData, error: permissionsError } = await supabase
        .from('permissions')
        .select('*');
      
      if (permissionsError) throw permissionsError;
      setPermissions(permissionsData || []);
      
      // Fetch role permissions
      const { data: rolePermData, error: rolePermError } = await supabase
        .from('role_permissions')
        .select('*');
      
      if (rolePermError) throw rolePermError;
      
      // Group permissions by role
      const groupedPermissions: Record<string, string[]> = {
        admin: [],
        editor: [],
        viewer: [],
      };
      
      rolePermData?.forEach(rp => {
        if (groupedPermissions[rp.role]) {
          groupedPermissions[rp.role].push(rp.permission_id);
        }
      });
      
      setRolePermissions(groupedPermissions);
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
      // First, check if the user already exists
      const { data: existingUsers, error: checkError } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('email', newUserEmail);
      
      if (checkError) throw checkError;
      
      if (existingUsers && existingUsers.length > 0) {
        toast.warning("Este email já está registrado");
        setLoading(false);
        return;
      }
      
      // Add new user
      const { data, error } = await supabase
        .from('user_profiles')
        .insert([
          { email: newUserEmail, role: newUserRole }
        ])
        .select();
      
      if (error) throw error;
      
      toast.success("Usuário adicionado com sucesso");
      setNewUserEmail("");
      setNewUserRole("viewer");
      
      // Important: Update the user list to show the newly added user
      fetchUsers();
    } catch (error) {
      console.error("Error adding user:", error);
      toast.error("Falha ao adicionar usuário");
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
      // First, delete all existing permissions
      const { error: deleteError } = await supabase
        .from('role_permissions')
        .delete()
        .neq('role', ''); // Delete all rows
      
      if (deleteError) throw deleteError;
      
      // Generate records to insert
      const permissionsToInsert = Object.entries(rolePermissions).flatMap(([role, permissionIds]) => 
        permissionIds.map(permId => ({
          role,
          permission_id: permId
        }))
      );
      
      if (permissionsToInsert.length > 0) {
        const { error: insertError } = await supabase
          .from('role_permissions')
          .insert(permissionsToInsert);
        
        if (insertError) throw insertError;
      }
      
      toast.success("Permissões salvas com sucesso");
    } catch (error) {
      console.error("Error saving permissions:", error);
      toast.error("Falha ao salvar permissões");
    } finally {
      setSavingPermissions(false);
    }
  };
  
  const deleteUser = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('user_profiles')
        .delete()
        .eq('id', userId);
      
      if (error) throw error;
      
      toast.success("Usuário removido com sucesso");
      fetchUsers(); // Refresh the list
    } catch (error) {
      console.error("Error deleting user:", error);
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
                    <p className="text-sm text-muted-foreground">
                      {user.role === 'admin' ? 'Administrador' : 
                       user.role === 'editor' ? 'Editor' : 'Visualizador'}
                    </p>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => deleteUser(user.id)}
                  >
                    Remover
                  </Button>
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
        </CardContent>
      </Card>
    </>
  );
}
