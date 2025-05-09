
import { supabase } from "@/integrations/supabase/client";
import { DatabaseTablesType } from "@/lib/database-types";
import { formatDateForSupabase } from "@/lib/supabase-utils";

// Function to get the count of records for a given table and date range
export async function getCountForPeriod(
  tableName: DatabaseTablesType,
  startDate: Date,
  endDate: Date,
  dateColumn: string = 'created_at'
): Promise<number> {
  try {
    const formattedStartDate = formatDateForSupabase(startDate);
    const formattedEndDate = formatDateForSupabase(endDate);
    
    // Use type assertion to handle the table name
    const { count, error } = await supabase
      .from(tableName as any)
      .select('*', { count: 'exact', head: true })
      .gte(dateColumn, formattedStartDate)
      .lte(dateColumn, formattedEndDate);
    
    if (error) throw error;
    
    return count || 0;
  } catch (error) {
    console.error(`Error getting count for ${tableName}:`, error);
    return 0;
  }
}
