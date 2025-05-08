
import { createClient } from '@supabase/supabase-js';
import { Database } from './database.types';
import { formatDateForSupabase } from '@/integrations/supabase/client';

// Get Supabase URL and anon key from environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Log the Supabase configuration for debugging
if (import.meta.env.DEV) {
  console.log('Supabase config:', {
    url: supabaseUrl,
    keyLength: supabaseAnonKey ? supabaseAnonKey.length : 0
  });
}

// Validate required environment variables
if (!supabaseUrl || supabaseUrl === 'https://your-supabase-url.supabase.co') {
  console.error('VITE_SUPABASE_URL is not set or is using the placeholder value.');
}

if (!supabaseAnonKey || supabaseAnonKey === 'your-anon-key') {
  console.error('VITE_SUPABASE_ANON_KEY is not set or is using the placeholder value.');
}

// Set fallback values for development to prevent client creation errors
const finalSupabaseUrl = supabaseUrl || 'https://cipgzfvvctekljfprezz.supabase.co';
const finalSupabaseAnonKey = supabaseAnonKey || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpcGd6ZnZ2Y3Rla2xqZnByZXp6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYxMjI4MDUsImV4cCI6MjA2MTY5ODgwNX0.IRa362fHbqACD4VExH1d4Coj7gNonFTvv-AWHGHaFzU';

// Initialize Supabase client with explicit auth configuration and timezone
export const supabase = createClient<Database>(
  finalSupabaseUrl, 
  finalSupabaseAnonKey,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      storage: localStorage
    },
    global: {
      headers: {
        'X-Timezone': 'America/Sao_Paulo',
        'Prefer': 'timezone=America/Sao_Paulo'
      }
    }
  }
);

// Format dates properly for Supabase with timezone consideration
export { formatDateForSupabase };

// Helper function for date handling with timezone
export const localToUTC = (date: Date): Date => {
  return new Date(date.getTime() - (date.getTimezoneOffset() * 60000));
};

// Helper function to check if a table exists
export async function checkTableExists(tableName: string): Promise<boolean> {
  try {
    // Try to query the table directly first
    const { count, error: countError } = await supabase
      .from(tableName)
      .select('*', { count: 'exact', head: true });
    
    // If no error occurred, the table exists
    if (!countError) {
      return true;
    }
    
    // Try using an RPC function if available
    const { data, error: rpcError } = await supabase
      .rpc('get_table_existence', { table_name: tableName });
    
    if (!rpcError && data !== null) {
      return !!data;
    }
    
    // Final fallback: try to get columns which would fail if table doesn't exist
    const { data: columnsData, error: columnsError } = await supabase
      .from(tableName)
      .select()
      .limit(1);
    
    return !columnsError;
  } catch (error) {
    console.error(`Error checking if table ${tableName} exists:`, error);
    return false;
  }
}

// Helper types for tables and views
export type Tables = Database['public']['Tables'];
export type Views = Database['public']['Views'];
export type Enums = Database['public']['Enums'];

// Helper types for common tables
export type Professional = Tables['professionals']['Row'];
export type Service = Tables['services']['Row'];
export type Customer = Tables['customers']['Row'];
export type Appointment = Tables['appointments']['Row'];
export type ProfessionalPayment = Tables['professional_payments']['Row'];
export type MarketingChannel = Tables['marketing_channels']['Row'];
export type PaymentMethod = Tables['payment_methods']['Row'];

// Helper types for views
export type DailyRevenue = Views['daily_revenue']['Row'];
export type MarketingPerformance = Views['marketing_performance']['Row'];
export type ProfessionalEarnings = Views['professional_earnings']['Row'];

// Create a function to check if we have access to the specified function
export async function checkFunctionAccess(functionName: string): Promise<boolean> {
  try {
    const { error } = await supabase.rpc(functionName, { param: 'test' });
    // If the error is about invalid parameters but not about function not existing
    return !error || !error.message.includes('does not exist');
  } catch (error) {
    return false;
  }
}
