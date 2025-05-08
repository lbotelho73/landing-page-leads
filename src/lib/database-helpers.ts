import { supabase } from "@/integrations/supabase/client";
import { formatDateForSupabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { parseAndFormatDate } from "./xlsx-utils";
import { format } from "date-fns";

export async function checkAndInitializeTable(table: string) {
  try {
    console.log(`Checking table: ${table}`);
    
    // Try a direct count as the primary method
    try {
      const { count, error: countError } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });
      
      if (!countError) {
        console.log(`Table ${table} exists with count:`, count);
        return { exists: true, count: count || 0 };
      }
      
      // If we get an error that doesn't mention "relation does not exist", 
      // it could be a permissions issue but the table exists
      if (!countError.message?.includes("relation") || 
          !countError.message?.includes("does not exist")) {
        console.log(`Table ${table} exists but count failed:`, countError);
        return { exists: true, count: 0, error: countError };
      }
    } catch (directError: any) {
      // Continue to fallback method
      console.log(`Direct count failed for ${table}:`, directError);
    }
    
    // Fallback: check information_schema
    const { data, error } = await supabase.rpc('get_table_existence', { table_name: table });
    
    if (error) {
      console.error(`Error checking if table ${table} exists:`, error);
      return { exists: false, count: 0, error };
    }
    
    console.log(`Table ${table} exists check result:`, data);
    return { exists: !!data, count: 0 };
    
  } catch (error) {
    console.error(`Unexpected error checking table ${table}:`, error);
    return { exists: false, count: 0, error };
  }
}

export async function logError(feature: string, error: any) {
  console.error(`Error in ${feature}:`, error);
  
  if (!error) {
    toast.error(`Ocorreu um erro em ${feature}`);
    return;
  }
  
  if (error?.message) {
    toast.error(`Erro: ${error.message}`);
  } else if (error?.error_description) {
    toast.error(`Erro: ${error.error_description}`);
  } else if (typeof error === 'string') {
    toast.error(error);
  } else {
    toast.error(`Ocorreu um erro em ${feature}`);
  }
}

export async function runQuery(query: any) {
  try {
    const { data, error, count } = await query;
    
    if (error) throw error;
    return { data, count, success: true };
  } catch (error: any) {
    console.error("Query error:", error);
    
    // Try to extract the most useful error message
    let errorMessage = "Erro ao executar consulta";
    if (error.message) {
      errorMessage = error.message;
    } else if (error.error_description) {
      errorMessage = error.error_description;
    } else if (error.details) {
      errorMessage = error.details;
    }
    
    toast.error(errorMessage);
    return { data: null, success: false, error };
  }
}

// Updated to use the new SQL function for getting table columns
export async function getTableColumns(tableName: string) {
  console.log(`Fetching columns for table: ${tableName}`);
  
  try {
    // First try using the database function we created in SQL
    const { data: rpcData, error: rpcError } = await supabase
      .rpc('get_importable_columns', { table_name: tableName });
      
    if (!rpcError && rpcData && rpcData.length > 0) {
      console.log(`Got columns via RPC for ${tableName}:`, rpcData);
      return rpcData.filter((col: string) => 
        !col.includes('default-value')
      );
    }
    
    console.log(`RPC method failed for ${tableName}:`, rpcError);
    
    // If RPC fails, try to get sample data to extract columns
    const { data: sampleData, error: sampleError } = await supabase
      .from(tableName)
      .select('*')
      .limit(1)
      .single();
    
    if (!sampleError && sampleData) {
      const columns = Object.keys(sampleData).filter(col => 
        !['id', 'created_at', 'updated_at'].includes(col) &&
        !col.includes('default-value')
      );
      console.log(`Got columns from sample row for ${tableName}:`, columns);
      return columns;
    }
    
    // If that fails too, try querying the information_schema directly
    const { data: schemaData, error: schemaError } = await supabase
      .from('information_schema.columns')
      .select('column_name')
      .eq('table_schema', 'public')
      .eq('table_name', tableName)
      .not('column_name', 'in', '(id,created_at,updated_at)');
      
    if (!schemaError && schemaData && schemaData.length > 0) {
      const columns = schemaData
        .map(col => col.column_name)
        .filter((col: string) => 
          !['id', 'created_at', 'updated_at'].includes(col) && 
          !col.includes('default-value')
        );
      
      console.log(`Got columns from information_schema for ${tableName}:`, columns);
      return columns;
    }
    
    console.error(`Failed to get columns for ${tableName}:`, sampleError || schemaError || "No data available");
    return [];
  } catch (error) {
    console.error(`Error getting columns for table ${tableName}:`, error);
    toast.error(`Erro ao buscar colunas da tabela "${tableName}"`);
    return []; // Return empty array to prevent UI crashes
  }
}

// Updated function to get translation of field names
export function getFieldTranslation(field: string): string {
  const translations: Record<string, string> = {
    // Customer fields
    'first_name': 'Nome',
    'last_name': 'Sobrenome',
    'whatsapp_number': 'WhatsApp',
    'allows_whatsapp': 'Permite WhatsApp',
    'referral_source': 'Como nos conheceu',
    'notes': 'Observações',
    'numeric_id': 'ID Numérico',
    
    // Professional fields
    'commission_percentage': 'Percentual de Comissão',
    'profile_image_url': 'URL da Imagem',
    'email': 'Email',
    'phone': 'Telefone',
    'alias_name': 'Nome Artístico',
    'is_active': 'Ativo',
    
    // Service fields
    'name': 'Nome',
    'description': 'Descrição',
    'duration': 'Duração (min)',
    'price': 'Preço',
    'requires_two_professionals': 'Requer dois profissionais',
    'service_category_id': 'Categoria',
    'professional_commission_percentage': 'Comissão (%)',
    
    // Appointment fields
    'date': 'Data',
    'time': 'Horário',
    'customer_id': 'Cliente',
    'service_id': 'Serviço',
    'primary_professional_id': 'Profissional',
    'secondary_professional_id': 'Profissional Secundário',
    'service_duration': 'Duração',
    'service_price': 'Preço do Serviço',
    'payment_method_id': 'Método de Pagamento',
    'has_discount': 'Tem Desconto',
    'discount_percentage': 'Percentual de Desconto',
    'final_price': 'Preço Final',
    'is_completed': 'Completado',
    'cancellation_reason': 'Motivo do Cancelamento',
    'marketing_channel_id': 'Canal de Marketing',
    'professional_payment_status': 'Status de Pagamento',
    'professional_payment_date': 'Data de Pagamento'
  };
  
  return translations[field] || field;
}

// Validate required fields for a specific table
export function validateRequiredFields(tableName: string, data: any): { isValid: boolean, missingFields: string[] } {
  const requiredFields: Record<string, string[]> = {
    'customers': ['first_name'],
    'professionals': ['first_name', 'last_name', 'commission_percentage'],
    'services': ['name', 'duration', 'price'],
    // Modified required fields for appointments - making more fields optional
    'appointments': ['date', 'service_price', 'final_price']
  };
  
  const fields = requiredFields[tableName] || [];
  const missingFields: string[] = [];
  
  for (const field of fields) {
    if (!data[field] && data[field] !== 0 && data[field] !== false) {
      missingFields.push(getFieldTranslation(field));
    }
  }
  
  return {
    isValid: missingFields.length === 0,
    missingFields
  };
}

// Helper function to get categories for service imports
export async function getServiceCategories() {
  try {
    const { data, error } = await supabase
      .from('service_categories')
      .select('id, name')
      .eq('is_active', true)
      .order('name', { ascending: true });
      
    if (error) {
      console.error('Error fetching service categories:', error);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error('Error fetching service categories:', error);
    return [];
  }
}

// Helper function to find category id by name
export async function findCategoryIdByName(categoryName: string) {
  if (!categoryName) return null;
  
  try {
    const { data, error } = await supabase
      .from('service_categories')
      .select('id')
      .ilike('name', categoryName)
      .limit(1)
      .single();
      
    if (error || !data) {
      console.log(`No category found with name: ${categoryName}`);
      return null;
    }
    
    return data.id;
  } catch (error) {
    console.error(`Error finding category by name "${categoryName}":`, error);
    return null;
  }
}

// Helper function to get marketing performance data
export async function getMarketingData(type: 'month' | 'year' | 'all', currentDateFilter?: Date) {
  try {
    // Call the stored function that combines both direct and indirect attribution
    const { data, error } = await supabase
      .rpc('get_marketing_performance_combined');
      
    if (error) {
      console.error("Error fetching marketing performance data:", error);
      throw error;
    }

    // Filter the data based on the date filter
    let filteredData = [...(data || [])];
    const currentYear = currentDateFilter ? currentDateFilter.getFullYear() : getCurrentYear();
    const currentMonth = currentDateFilter ? currentDateFilter.getMonth() + 1 : new Date().getMonth() + 1;
    
    console.log(`Filtering marketing data by ${type}, current year: ${currentYear}, current month: ${currentMonth}`);

    if (type === 'month') {
      filteredData = filteredData.filter(item => 
        item.year === currentYear && item.month === currentMonth
      );
    } else if (type === 'year') {
      filteredData = filteredData.filter(item => 
        item.year === currentYear
      );
    }
    
    console.log(`Filtered marketing data:`, filteredData);

    // Group data by channel
    const groupedData = filteredData.reduce((acc: Record<string, any>, item) => {
      const channelId = item.channel_id;
      
      if (!acc[channelId]) {
        acc[channelId] = {
          id: channelId,
          name: item.channel_name,
          total_appointments: 0,
          total_revenue: 0
        };
      }
      
      acc[channelId].total_appointments += Number(item.total_appointments);
      acc[channelId].total_revenue += Number(item.total_revenue);
      
      return acc;
    }, {});
    
    // Convert the grouped data object to an array
    const result = Object.values(groupedData);
    console.log(`Grouped marketing data:`, result);
    
    return result;
  } catch (error) {
    console.error("Error in getMarketingData:", error);
    return [];
  }
}

// Processing direct and indirect marketing data
export async function getMarketingChannelsWithData() {
  try {
    // Get all marketing channels
    const { data: channels, error: channelsError } = await supabase
      .from('marketing_channels')
      .select('*')
      .eq('is_active', true)
      .order('name');
      
    if (channelsError) {
      console.error("Error fetching marketing channels:", channelsError);
      return [];
    }
    
    return channels || [];
  } catch (error) {
    console.error("Error in getMarketingChannelsWithData:", error);
    return [];
  }
}

// Helper function to ensure dates are formatted consistently
export { formatDateForSupabase };

// Import the Excel date formatting function from xlsx-utils
export { parseAndFormatDate as formatExcelDateForSupabase } from "@/lib/xlsx-utils";

// Helper function to fix the "this year" filter to use the current year
export function getCurrentYear(): number {
  return new Date().getFullYear(); // Returns 2025 in the app's context
}

// Fix marketing channel data retrieval by using both appointments and customer referral sources
export const getMarketingChannelData = async (dateRange?: { start: Date; end: Date }) => {
  try {
    console.log("Fetching marketing channel data with date range:", dateRange);
    
    // Get all marketing channels first to ensure we include ones with no data
    const { data: channels, error: channelsError } = await supabase
      .from('marketing_channels')
      .select('id, name, description')
      .order('name');
    
    if (channelsError) {
      console.error("Error fetching marketing channels:", channelsError);
      throw channelsError;
    }
    
    // Build query for appointments with marketing channels
    let appointmentsQuery = supabase
      .from('appointments')
      .select(`
        id,
        date,
        final_price,
        marketing_channel_id,
        customer_id,
        customers:customer_id (id, referral_source)
      `);
    
    // Add date filter if provided
    if (dateRange) {
      const formattedStartDate = format(dateRange.start, 'yyyy-MM-dd');
      const formattedEndDate = format(dateRange.end, 'yyyy-MM-dd');
      
      appointmentsQuery = appointmentsQuery
        .gte('date', formattedStartDate)
        .lte('date', formattedEndDate);
    }
    
    // Execute the query
    const { data: appointments, error: appointmentsError } = await appointmentsQuery;
    
    if (appointmentsError) {
      console.error("Error fetching appointments:", appointmentsError);
      throw appointmentsError;
    }
    
    console.log(`Fetched ${appointments?.length || 0} appointments`);
    
    // Process the data to combine marketing channel information
    const channelStats: Record<string, { 
      id: string;
      name: string; 
      revenue: number; 
      appointments: number;
      customers: Set<string>; 
    }> = {};
    
    // Initialize all channels with zero values
    if (channels) {
      channels.forEach(channel => {
        channelStats[channel.id] = {
          id: channel.id,
          name: channel.name,
          revenue: 0,
          appointments: 0,
          customers: new Set()
        };
      });
    }
    
    // Add an entry for "Not specified"
    channelStats["not_specified"] = {
      id: "not_specified",
      name: "Não especificado",
      revenue: 0,
      appointments: 0,
      customers: new Set()
    };
    
    // Process appointments
    if (appointments) {
      appointments.forEach(appointment => {
        // Get data we need
        const channelId = appointment.marketing_channel_id;
        const customerId = appointment.customer_id;
        const finalPrice = Number(appointment.final_price) || 0;
        
        // Fixed the type issue - properly type the customers object and access referral_source
        const referralSource = appointment.customers && typeof appointment.customers === 'object' ? 
          (appointment.customers as { referral_source?: string }).referral_source : undefined;
        
        // Case 1: Appointment has a direct marketing channel assigned
        if (channelId && channelStats[channelId]) {
          channelStats[channelId].revenue += finalPrice;
          channelStats[channelId].appointments += 1;
          if (customerId) {
            channelStats[channelId].customers.add(customerId);
          }
        }
        // Case 2: Appointment has a customer with referral_source that matches a channel name
        else if (referralSource && channels) {
          // Try to find a matching channel by name
          const matchingChannel = channels.find(channel => 
            channel.name.toLowerCase() === referralSource.toLowerCase()
          );
          
          if (matchingChannel) {
            channelStats[matchingChannel.id].revenue += finalPrice;
            channelStats[matchingChannel.id].appointments += 1;
            if (customerId) {
              channelStats[matchingChannel.id].customers.add(customerId);
            }
          } else {
            // No matching channel found, add to "Not specified"
            channelStats["not_specified"].revenue += finalPrice;
            channelStats["not_specified"].appointments += 1;
            if (customerId) {
              channelStats["not_specified"].customers.add(customerId);
            }
          }
        }
        // Case 3: No marketing channel and no referral source
        else {
          channelStats["not_specified"].revenue += finalPrice;
          channelStats["not_specified"].appointments += 1;
          if (customerId) {
            channelStats["not_specified"].customers.add(customerId);
          }
        }
      });
    }
    
    // Convert to array format with proper counts
    const result = Object.values(channelStats)
      .filter(item => item.revenue > 0 || item.customers.size > 0)
      .map(item => ({
        id: item.id,
        name: item.name,
        revenue: item.revenue,
        appointments: item.appointments,
        customers: item.customers.size
      }));
    
    return result;
  } catch (error) {
    console.error("Error in getMarketingChannelData:", error);
    throw error;
  }
};
