
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
      // Since we haven't created the user_profiles table yet, we'll use mock data
      // In the future, this will be replaced with a real API call
      setUsers([
        { id: "1", email: "admin@example.com", role: "admin" as Role },
        { id: "2", email: "editor@example.com", role: "editor" as Role },
        { id: "3", email: "viewer@example.com", role: "viewer" as Role }
      ]);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast.error("Falha ao carregar usuários");
    }
  };
  
  const fetchPermissions = async () => {
    try {
      // Using predefined permissions until we create the permissions table
      setPermissions([
        { id: "1", name: "Registro de Usuário", description: "Registrar novos usuários no sistema", adminDefault: true, editorDefault: false, viewerDefault: false },
        { id: "2", name: "Gestão de Métodos de Pagamento", description: "Adicionar e editar métodos de pagamento", adminDefault: true, editorDefault: true, viewerDefault: false },
        { id: "3", name: "Gestão de Canais de Marketing", description: "Adicionar e editar canais de marketing", adminDefault: true, editorDefault: true, viewerDefault: false },
        { id: "4", name: "Gestão de Categorias de Serviço", description: "Adicionar e editar categorias de serviço", adminDefault: true, editorDefault: true, viewerDefault: false },
        { id: "5", name: "Configuração de Horários", description: "Definir dias e horários de funcionamento", adminDefault: true, editorDefault: false, viewerDefault: false },
        { id: "6", name: "Acesso a Relatórios", description: "Visualizar relatórios financeiros", adminDefault: true, editorDefault: true, viewerDefault: true },
        { id: "7", name: "Gestão de Agendamentos", description: "Criar e editar agendamentos", adminDefault: true, editorDefault: true, viewerDefault: false },
        { id: "8", name: "Visualizar Agendamentos", description: "Visualizar a agenda de serviços", adminDefault: true, editorDefault: true, viewerDefault: true },
        { id: "9", name: "Gestão de Clientes", description: "Adicionar e editar clientes", adminDefault: true, editorDefault: true, viewerDefault: false },
        { id: "10", name: "Gestão de Profissionais", description: "Adicionar e editar profissionais", adminDefault: true, editorDefault: false, viewerDefault: false },
        { id: "11", name: "Gestão de Serviços", description: "Adicionar e editar serviços oferecidos", adminDefault: true, editorDefault: true, viewerDefault: false },
        { id: "12", name: "Gestão de Pagamentos", description: "Registrar e editar pagamentos", adminDefault: true, editorDefault: true, viewerDefault: false }
      ]);
      
      // Initialize role permissions based on defaults
      const adminPermissions = permissions
        .filter(p => p.adminDefault)
        .map(p => p.id);
      
      const editorPermissions = permissions
        .filter(p => p.editorDefault)
        .map(p => p.id);
      
      const viewerPermissions = permissions
        .filter(p => p.viewerDefault)
        .map(p => p.id);
      
      setRolePermissions({
        admin: adminPermissions,
        editor: editorPermissions,
        viewer: viewerPermissions
      });
      
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
      // Create new user with the mock data for now
      const newUser = {
        id: `${users.length + 1}`,
        email: newUserEmail,
        role: newUserRole
      };
      
      setUsers(prev => [...prev, newUser]);
      
      toast.success("Usuário adicionado com sucesso");
      setNewUserEmail("");
      setNewUserRole("viewer");
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
      // In the future, this will save to the database
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
      setUsers(prev => prev.filter(user => user.id !== userId));
      toast.success("Usuário removido com sucesso");
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
