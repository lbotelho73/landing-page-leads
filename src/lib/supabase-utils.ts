
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
    // Pass through all other values
    else {
      result[key] = value;
    }
  }
  
  return result;
};

// Helper function for handling Excel date conversion
export const parseAndFormatDate = (value: any): string | null => {
  if (!value) return null;
  
  try {
    if (typeof value === 'number') {
      // Convert Excel date number to JS Date
      const date = new Date(Math.round((value - 25569) * 86400 * 1000));
      return formatDateForSupabase(date);
    } else if (typeof value === 'string') {
      // Try to parse as date string
      const date = new Date(value);
      if (!isNaN(date.getTime())) {
        return formatDateForSupabase(date);
      }
    }
    return String(value);
  } catch (error) {
    console.error("Error parsing date:", error);
    return null;
  }
};
