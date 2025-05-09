
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
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Format role for display
  const formatRole = (role: string) => {
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
        // Fetch user profiles from database
        const { data, error } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('role', 'admin')
          .or('role.eq.editor,role.eq.viewer');
        
        if (error) throw error;
        
        if (data && data.length > 0) {
          // Format the data for display
          const formattedMembers: TeamMember[] = data.map(user => ({
            name: user.email.split('@')[0],  // Use email username as name if no name available
            email: user.email,
            avatarFallback: getInitials(user.email.split('@')[0]),
            role: user.role
          }));
          
          setTeamMembers(formattedMembers);
        } else {
          // If no members found, show the default
          setTeamMembers([{
            name: "Admin",
            email: "admin@example.com",
            avatarFallback: "AD",
            role: "admin"
          }]);
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
