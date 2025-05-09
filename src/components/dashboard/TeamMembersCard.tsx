
import { useState, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface TeamMember {
  name: string;
  email: string;
  avatarUrl?: string;
  avatarFallback: string;
  role: string;
}

interface TeamMembersCardProps {
  members?: TeamMember[];
}

export function TeamMembersCard({ members = [] }: TeamMembersCardProps) {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>(members);
  const [loading, setLoading] = useState(true);

  // Function to get initials from name
  const getInitials = (name: string) => {
    if (!name) return "??";
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Format role for display
  const formatRole = (role: string) => {
    if (!role) return "Usuário";
    switch (role.toLowerCase()) {
      case 'admin': return 'Administrador';
      case 'editor': return 'Editor';
      case 'viewer': return 'Visualizador';
      default: return role;
    }
  };

  useEffect(() => {
    const fetchTeamMembers = async () => {
      setLoading(true);
      try {
        // First try the auth.users table
        const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
        
        if (!authError && authUsers && authUsers.users.length > 0) {
          console.log("Auth users found:", authUsers.users);
          
          // Format the data for display
          const formattedMembers: TeamMember[] = authUsers.users.map(user => ({
            name: user.user_metadata?.name || user.email?.split('@')[0] || "User",
            email: user.email || "",
            avatarFallback: getInitials(user.user_metadata?.name || user.email?.split('@')[0] || "User"),
            role: user.role || "viewer"
          }));
          
          setTeamMembers(formattedMembers);
          setLoading(false);
          return;
        }
        
        // If we can't access auth.users, try the user_profiles table
        const { data: profiles, error: profilesError } = await supabase
          .from('user_profiles')
          .select('*');
        
        if (!profilesError && profiles && profiles.length > 0) {
          console.log("User profiles found:", profiles);
          
          // Format the data for display
          const formattedMembers: TeamMember[] = profiles.map(profile => ({
            name: profile.email.split('@')[0],
            email: profile.email,
            avatarFallback: getInitials(profile.email.split('@')[0]),
            role: profile.role || "viewer"
          }));
          
          setTeamMembers(formattedMembers);
        } else {
          // As a last resort, try to check if there's an authenticated user
          const { data: authData } = await supabase.auth.getUser();
          
          if (authData && authData.user) {
            console.log("Current authenticated user found:", authData.user);
            
            // Add the current user
            setTeamMembers([{
              name: authData.user.user_metadata?.name || authData.user.email?.split('@')[0] || "Admin",
              email: authData.user.email || "admin@example.com",
              avatarFallback: getInitials(authData.user.user_metadata?.name || authData.user.email?.split('@')[0] || "AD"),
              role: "admin"
            }]);
          } else {
            // If no members are found, show a placeholder admin
            console.log("No team members found, showing placeholder");
            setTeamMembers([{
              name: "Admin",
              email: "admin@example.com",
              avatarFallback: "AD",
              role: "admin"
            }]);
          }
        }
      } catch (error) {
        console.error('Error fetching team members:', error);
        toast.error('Falha ao carregar membros da equipe');
        // Set default member on error
        setTeamMembers([{
          name: "Admin",
          email: "admin@example.com",
          avatarFallback: "AD",
          role: "admin"
        }]);
      } finally {
        setLoading(false);
      }
    };
    
    fetchTeamMembers();
  }, []);

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>Equipe</CardTitle>
        <CardDescription>Membros da equipe</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-4">Carregando membros...</div>
        ) : teamMembers.length > 0 ? (
          teamMembers.map((member, index) => (
            <div key={index} className="flex items-center space-x-4 mb-4 last:mb-0">
              <Avatar>
                <AvatarImage src={member.avatarUrl} alt={member.name} />
                <AvatarFallback>{member.avatarFallback}</AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-medium leading-none">{member.name}</p>
                <p className="text-sm text-muted-foreground">
                  {member.email}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {formatRole(member.role)}
                </p>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-4 text-muted-foreground">
            Nenhum membro na equipe
          </div>
        )}
      </CardContent>
    </Card>
  );
}
