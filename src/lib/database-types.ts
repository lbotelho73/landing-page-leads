
// Define types for table and view names to help with type checking
export type DatabaseTablesType = 
  | "appointments" 
  | "customers" 
  | "marketing_channels" 
  | "payment_methods" 
  | "professionals" 
  | "services" 
  | "business_hours" 
  | "permissions" 
  | "professional_payments" 
  | "professional_schedules" 
  | "role_permissions" 
  | "service_categories" 
  | "user_profiles";

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

// Helper functions to cast database tables and views with type safety
export function asDbTable<T extends DatabaseTablesType>(tableName: DatabaseTablesType): T {
  return tableName as T;
}

export function asDbView<T extends DatabaseViewsType>(viewName: DatabaseViewsType): T {
  return viewName as T;
}

// String overloads for dynamic tables
export function asDbTable(tableName: string): DatabaseTablesType {
  return tableName as DatabaseTablesType;
}

export function asDbView(viewName: string): DatabaseViewsType {
  return viewName as DatabaseViewsType;
}
