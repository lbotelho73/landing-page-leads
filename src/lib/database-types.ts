
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

// Function overloads for asDbTable - combining generic and string versions
export function asDbTable<T extends DatabaseTablesType>(tableName: T): T;
export function asDbTable(tableName: string): DatabaseTablesType;
export function asDbTable(tableName: string | DatabaseTablesType): DatabaseTablesType {
  return tableName as DatabaseTablesType;
}

// Function overloads for asDbView - combining generic and string versions
export function asDbView<T extends DatabaseViewsType>(viewName: T): T;
export function asDbView(viewName: string): DatabaseViewsType;
export function asDbView(viewName: string | DatabaseViewsType): DatabaseViewsType {
  return viewName as DatabaseViewsType;
}
