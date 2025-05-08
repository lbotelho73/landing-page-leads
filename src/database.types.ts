
// Created a simple helper file to temporarily provide database types until 
// the Supabase tables are created

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
  | "service_categories";

export type DatabaseViewsType = 
  | "professional_earnings"
  | "daily_revenue"
  | "marketing_performance";
