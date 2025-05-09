
import { supabase } from "@/integrations/supabase/client";
import { formatDateForSupabase } from "@/lib/supabase-utils";
import { DatabaseTablesType, asDbTable } from "@/lib/database-types";

/**
 * Checks if a table exists and returns its existence status.
 */
export async function checkTableExists(tableName: DatabaseTablesType): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from(tableName)
      .select('*', { count: 'exact', head: true })
      .limit(1);
    
    if (error && error.code === '42P01') {
      return false; // Table doesn't exist
    }
    
    return true;
  } catch (error) {
    console.error(`Error checking if table ${tableName} exists:`, error);
    return false;
  }
}

/**
 * Checks if a table exists and attempts to initialize it if needed.
 * Returns whether the table exists or not.
 */
export async function checkAndInitializeTable(tableName: DatabaseTablesType): Promise<{ exists: boolean, initialized?: boolean }> {
  try {
    // Check if table exists
    const exists = await checkTableExists(tableName);
    
    if (!exists) {
      console.error(`Table ${tableName} does not exist`);
      return { exists: false };
    }
    
    return { exists: true };
  } catch (error) {
    console.error(`Error checking table ${tableName}:`, error);
    return { exists: false };
  }
}

/**
 * Gets table schemas for a list of tables
 */
export async function getTableSchemas(tableNames: DatabaseTablesType[]): Promise<Record<string, any>> {
  const schemas: Record<string, any> = {};
  
  for (const tableName of tableNames) {
    try {
      const { data, error } = await supabase.rpc('get_table_columns', { 
        table_name: tableName 
      });
      
      if (error) throw error;
      
      schemas[tableName] = data || [];
    } catch (error) {
      console.error(`Error getting schema for ${tableName}:`, error);
      schemas[tableName] = [];
    }
  }
  
  return schemas;
}

/**
 * Gets all tables and their schemas
 */
export async function getAllTables(): Promise<{ name: string; columns: string[] }[]> {
  const tables: { name: string; columns: string[] }[] = [];
  
  try {
    // This needs to be a raw SQL query since we're accessing information_schema
    // which isn't in the typed tables
    const { data, error } = await supabase
      .rpc('get_all_tables');
      
    if (error) throw error;
    
    if (data && Array.isArray(data)) {
      for (const table of data) {
        const columns = await getTableColumns(asDbTable(table.table_name));
        tables.push({
          name: table.table_name,
          columns
        });
      }
    }
    
    return tables;
  } catch (error) {
    console.error("Error getting all tables:", error);
    return [];
  }
}

/**
 * Gets columns for a specific table
 */
export async function getTableColumns(tableName: DatabaseTablesType): Promise<string[]> {
  try {
    const { data, error } = await supabase.rpc('get_table_columns', { 
      table_name: tableName 
    });
    
    if (error) throw error;
    
    return data || [];
  } catch (error) {
    console.error(`Error getting columns for ${tableName}:`, error);
    return [];
  }
}
