
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface TeamMember {
  name: string;
  email: string;
  avatarUrl?: string;
  avatarFallback: string;
}

interface TeamMembersCardProps {
  members?: TeamMember[];
}

export function TeamMembersCard({ members = [] }: TeamMembersCardProps) {
  // Default member if none provided
  const defaultMembers: TeamMember[] = members.length ? members : [
    {
      name: "shadcn",
      email: "shadcn@example.com",
      avatarUrl: "https://github.com/shadcn.png",
      avatarFallback: "CN"
    }
  ];

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>Equipe</CardTitle>
        <CardDescription>Membros da equipe</CardDescription>
      </CardHeader>
      <CardContent>
        {defaultMembers.map((member, index) => (
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
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
