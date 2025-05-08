
// Database types for Supabase tables and views
export type DatabaseTablesType = 
  | "appointments" 
  | "customers" 
  | "marketing_channels" 
  | "payment_methods" 
  | "professionals" 
  | "services"
  | "business_hours" 
  | "professional_payments" 
  | "professional_schedules" 
  | "service_categories"
  | "user_profiles"
  | "permissions"
  | "role_permissions";

export type DatabaseViewsType = 
  | "professional_earnings"
  | "daily_revenue"
  | "marketing_performance";

export interface UserProfile {
  id: string;
  email: string;
  role: "admin" | "editor" | "viewer";
  created_at?: string;
}

export interface Permission {
  id: string;
  name: string;
  description: string;
  created_at?: string;
  updated_at?: string;
}

export interface RolePermission {
  id: string;
  role: string;
  permission_id: string;
  created_at?: string;
}
