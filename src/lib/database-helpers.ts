
import { supabase } from "@/integrations/supabase/client";
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
      const { data, error } = await supabase.rpc("get_table_columns", { 
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
    // Use a raw query instead of RPC to get all tables
    const { data, error } = await supabase
      .rpc("get_table_columns", { table_name: "tables" });
      
    if (error) throw error;
    
    // If we have data, process it
    if (data && Array.isArray(data)) {
      // Since we're not getting table_name property directly anymore,
      // we need to extract unique table names from the columns information
      const tableNameSet = new Set<string>();
      
      // First gather all potential table names
      data.forEach(item => {
        if (typeof item === 'object' && item !== null && 'column_name' in item) {
          const columnName = String(item.column_name);
          // Try to extract table name from qualified column name if present
          if (columnName && typeof columnName === 'string' && columnName.includes('.')) {
            tableNameSet.add(columnName.split('.')[0]);
          }
        }
      });
      
      // Convert the Set to an array of table names
      const tableNames = Array.from(tableNameSet);
      
      // Now fetch columns for each identified table
      for (const tableName of tableNames) {
        // Skip system tables or other non-standard tables
        if (tableName.startsWith('pg_') || tableName === 'unknown') continue;
        
        const columns = await getTableColumns(asDbTable(tableName as DatabaseTablesType));
        tables.push({
          name: tableName,
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
    console.log(`Getting columns for table: ${tableName}`);
    
    const { data, error } = await supabase.rpc("get_table_columns", { 
      table_name: tableName 
    });
    
    if (error) throw error;
    
    console.log(`Raw column data for ${tableName}:`, data);
    
    if (data && Array.isArray(data)) {
      // Convert complex objects to strings if needed
      const columns = data.map(item => {
        if (typeof item === 'object' && item !== null && 'column_name' in item) {
          return String(item.column_name);
        }
        return String(item);
      });
      
      console.log(`Processed columns for ${tableName}:`, columns);
      return columns;
    }
    
    return [];
  } catch (error) {
    console.error(`Error getting columns for ${tableName}:`, error);
    return [];
  }
}
