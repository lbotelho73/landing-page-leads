
// Import and re-export xlsx to ensure it's properly loaded
import * as XLSX from 'xlsx';

export { XLSX };

// Helper functions for working with Excel files
export const jsonToExcel = (data: any[]): Blob => {
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
  
  const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  return new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
};

export const excelToJson = (buffer: ArrayBuffer): any[] => {
  const wb = XLSX.read(buffer, { type: 'array' });
  const wsname = wb.SheetNames[0];
  const ws = wb.Sheets[wsname];
  return XLSX.utils.sheet_to_json(ws);
};

export const jsonToCsv = (data: any[]): string => {
  const ws = XLSX.utils.json_to_sheet(data);
  return XLSX.utils.sheet_to_csv(ws);
};

// Excel date conversion function - improved with better handling of various date formats
export const excelDateToJSDate = (excelDate: number | string): Date | null => {
  // If already a string, try to parse it
  if (typeof excelDate === 'string') {
    // Check if it looks like an Excel serial date (just numbers)
    if (/^\d+$/.test(excelDate)) {
      excelDate = parseInt(excelDate, 10);
    } else {
      // Already a date string, try to parse it directly
      const parsedDate = new Date(excelDate);
      return isNaN(parsedDate.getTime()) ? null : parsedDate;
    }
  }
  
  // If we have a number, treat as Excel serial date
  if (typeof excelDate === 'number') {
    // Excel's epoch starts on 1/1/1900, but there's an bug where 1900 is incorrectly treated as a leap year
    // So we need to adjust by 1 for dates after 2/28/1900
    const adjustedDate = excelDate > 59 ? excelDate - 1 : excelDate;
    
    // Convert Excel serial date (days since 1/1/1900) to JavaScript date
    // 25569 is the number of days between 1/1/1900 and 1/1/1970 (JS epoch start)
    const millisecondsPerDay = 24 * 60 * 60 * 1000;
    return new Date((adjustedDate - 25569) * millisecondsPerDay);
  }
  
  return null;
};

// Format a date value that might be in Excel format to YYYY-MM-DD
export const formatExcelDateForSupabase = (dateValue: any): string | null => {
  if (!dateValue) return null;
  
  const date = excelDateToJSDate(dateValue);
  if (!date) return null;
  
  // Format as YYYY-MM-DD for Supabase
  return date.toISOString().split('T')[0];
};

// Parse and format date from various formats (Excel, string, etc.)
// This is the main function to handle all date conversions
export const parseAndFormatDate = (value: any): string | null => {
  if (!value) return null;
  
  // Handle Excel numeric dates (most common issue with imports)
  if (typeof value === 'number' || (typeof value === 'string' && /^\d+$/.test(value))) {
    return formatExcelDateForSupabase(value);
  }
  
  // Handle date strings
  if (typeof value === 'string') {
    try {
      // Try to parse as regular date string
      const parsedDate = new Date(value);
      if (!isNaN(parsedDate.getTime())) {
        // Format as YYYY-MM-DD for Supabase
        return parsedDate.toISOString().split('T')[0];
      }
      
      // Handle Brazilian date format (DD/MM/YYYY)
      if (/^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(value)) {
        const parts = value.split('/');
        // Create date with year, month (0-based), day
        const parsedDate = new Date(
          parseInt(parts[2], 10), 
          parseInt(parts[1], 10) - 1, 
          parseInt(parts[0], 10)
        );
        if (!isNaN(parsedDate.getTime())) {
          return parsedDate.toISOString().split('T')[0];
        }
      }
    } catch (e) {
      console.error("Error parsing date:", e);
    }
  }
  
  // Handle Date objects
  if (value instanceof Date) {
    if (!isNaN(value.getTime())) {
      return value.toISOString().split('T')[0];
    }
  }
  
  return null;
};
