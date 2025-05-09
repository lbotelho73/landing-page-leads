
// Supabase utility functions for date formatting and data sanitization

// Helper function to ensure dates are handled consistently
export const formatDateForSupabase = (date: Date): string => {
  if (!date) return '';
  
  // Format in YYYY-MM-DD format with proper timezone handling
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  
  // Format as YYYY-MM-DD
  return `${year}-${month}-${day}`;
};

// Function to properly convert date to local timezone
export const convertToLocalDate = (dateString: string | null): Date | null => {
  if (!dateString) return null;
  
  // Parse date and adjust for timezone
  const date = new Date(dateString);
  return date;
};

// Helper function to ensure timestamps are serialized correctly for Supabase
export const sanitizeDataForSupabase = (data: any): any => {
  if (!data) return data;
  
  // If array, recursively sanitize each item
  if (Array.isArray(data)) {
    return data.map(item => sanitizeDataForSupabase(item));
  }
  
  // If not an object, return as is
  if (typeof data !== 'object' || data === null) {
    return data;
  }
  
  // Handle object properties
  const result: Record<string, any> = {};
  
  for (const [key, value] of Object.entries(data)) {
    // Handle Date objects
    if (value instanceof Date) {
      // If the key looks like a date field, format as YYYY-MM-DD
      if (key === 'date' || key.endsWith('_date')) {
        result[key] = formatDateForSupabase(value);
      } else {
        result[key] = value.toISOString();
      }
    } 
    // Handle nested objects/arrays
    else if (typeof value === 'object' && value !== null) {
      result[key] = sanitizeDataForSupabase(value);
    } 
    // Handle potential Excel date numbers for date fields
    else if ((key === 'date' || key.endsWith('_date')) && 
             (typeof value === 'number' || (typeof value === 'string' && /^\d+$/.test(value)))) {
      try {
        // Import the function directly to avoid circular dependencies
        const { parseAndFormatDate } = require('@/lib/xlsx-utils');
        const formattedDate = parseAndFormatDate(value);
        result[key] = formattedDate || value;
      } catch (error) {
        console.error("Error formatting date:", error);
        result[key] = value;
      }
    }
    // Pass through all other values
    else {
      result[key] = value;
    }
  }
  
  return result;
};

// Helper function to handle Excel date conversion for imports
export const handleExcelDate = (value: any): string | null => {
  if (!value) return null;
  
  try {
    // Import the function directly to avoid circular dependencies
    const { parseAndFormatDate } = require('@/lib/xlsx-utils');
    return parseAndFormatDate(value);
  } catch (error) {
    console.error("Error handling Excel date:", error);
    return null;
  }
};

// Type assertion helper for dynamic table names
export const asTableName = <T extends string>(name: string): T => {
  return name as T;
};
