
/**
 * Formats a date for use with Supabase queries.
 * Supabase expects dates in ISO format: YYYY-MM-DD
 */
export function formatDateForSupabase(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Sanitizes data for Supabase insertion by removing undefined values and
 * converting null values appropriately.
 */
export function sanitizeDataForSupabase<T>(data: T[]): T[] {
  return data.map(item => {
    const sanitized: any = {};
    
    Object.entries(item as any).forEach(([key, value]) => {
      // Skip undefined values
      if (value !== undefined) {
        sanitized[key] = value;
      }
    });
    
    return sanitized as T;
  });
}
