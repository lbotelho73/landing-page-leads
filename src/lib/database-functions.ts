
import { supabase } from "@/integrations/supabase/client";
import { formatDateForSupabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Generic function for updating data with proper date handling
export async function updateRecordWithDates(
  tableName: string, 
  id: string, 
  data: any, 
  dateFields: string[] = ['date']
) {
  try {
    // Process date fields if any
    const processedData = { ...data };
    
    // Format date fields properly for Supabase
    dateFields.forEach(field => {
      if (processedData[field] && processedData[field] instanceof Date) {
        processedData[field] = formatDateForSupabase(processedData[field]);
        console.log(`Formatted ${field} for update:`, processedData[field]);
      }
    });
    
    // Update record in database
    const { data: result, error } = await supabase
      .from(tableName)
      .update(processedData)
      .eq('id', id)
      .select();
      
    if (error) {
      console.error(`Error updating ${tableName}:`, error);
      toast.error(`Erro ao atualizar: ${error.message}`);
      return { success: false, error };
    }
    
    console.log(`${tableName} updated successfully:`, result);
    return { success: true, data: result };
  } catch (error) {
    console.error(`Error in updateRecordWithDates for ${tableName}:`, error);
    toast.error(`Erro ao atualizar registro`);
    return { success: false, error };
  }
}

// Function to fetch data from marketing performance view with date filters
export async function fetchMarketingPerformance(startDate: Date, endDate: Date) {
  try {
    // Format dates for Supabase
    const formattedStartDate = formatDateForSupabase(startDate);
    const formattedEndDate = formatDateForSupabase(endDate);
    
    console.log(`Fetching marketing performance from ${formattedStartDate} to ${formattedEndDate}`);
    
    // Get year and month values from dates
    const startYear = startDate.getFullYear();
    const endYear = endDate.getFullYear();
    const startMonth = startDate.getMonth() + 1; // JS months are 0-based
    const endMonth = endDate.getMonth() + 1;
    
    // Query the marketing_performance view
    const { data, error } = await supabase
      .from('marketing_performance')
      .select('*')
      .or(`year.gt.${startYear-1},and(year.eq.${startYear},month.gte.${startMonth})`)
      .or(`year.lt.${endYear+1},and(year.eq.${endYear},month.lte.${endMonth})`);
      
    if (error) {
      console.error("Error fetching marketing performance:", error);
      return { success: false, error };
    }
    
    console.log("Fetched marketing performance:", data);
    return { success: true, data };
  } catch (error) {
    console.error("Error in fetchMarketingPerformance:", error);
    return { success: false, error };
  }
}

// Function to run any query with proper error handling
export async function runDatabaseQuery(query: any) {
  try {
    const { data, error } = await query;
    
    if (error) {
      console.error("Database query error:", error);
      return { success: false, error };
    }
    
    return { success: true, data };
  } catch (error) {
    console.error("Error running database query:", error);
    return { success: false, error };
  }
}
