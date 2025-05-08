
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import ptBR from "@/lib/i18n";

export function MainNav({
  className,
  ...props
}: React.HTMLAttributes<HTMLElement>) {
  return (
    <nav className={cn("flex items-center space-x-4 lg:space-x-6", className)} {...props}>
      <Link to="/dashboard" className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary">
        {ptBR.overview}
      </Link>
      <Link to="/appointments" className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary">
        {ptBR.appointments}
      </Link>
      <Link to="/reports" className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary">
        {ptBR.reports}
      </Link>
    </nav>
  );
}
