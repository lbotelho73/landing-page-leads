
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

export type UserProfileRole = "admin" | "editor" | "viewer";

export interface UserProfile {
  id: string;
  email: string;
  role: UserProfileRole;
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
  role: UserProfileRole;
  permission_id: string;
  created_at?: string;
}

// Helper function to cast table names for type safety
export function asDbTable<T extends DatabaseTablesType>(tableName: T): T;
export function asDbTable(tableName: string): DatabaseTablesType;
export function asDbTable(tableName: string | DatabaseTablesType): DatabaseTablesType {
  return tableName as DatabaseTablesType;
}

// Helper function to cast view names for type safety
export function asDbView<T extends DatabaseViewsType>(viewName: T): T;
export function asDbView(viewName: string): DatabaseViewsType;
export function asDbView(viewName: string | DatabaseViewsType): DatabaseViewsType {
  return viewName as DatabaseViewsType;
}
