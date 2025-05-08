
export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
};

export const formatDate = (date: Date | string): string => {
  if (!date) return '';
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(dateObj);
};

export const formatTime = (time: string): string => {
  if (!time) return '';
  
  // Assuming time is in format "HH:MM" or "HH:MM:SS"
  const [hours, minutes] = time.split(':');
  return `${hours}:${minutes}`;
};

export const formatDateForDisplay = (date: Date | string): string => {
  if (!date) return '';
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  }).format(dateObj);
};

export const formatDateTimeForDisplay = (date: Date | string): string => {
  if (!date) return '';
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(dateObj);
};

export const formatDuration = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  
  if (hours > 0 && mins > 0) {
    return `${hours}h ${mins}min`;
  } else if (hours > 0) {
    return `${hours}h`;
  } else {
    return `${mins}min`;
  }
};

// Helper function to get current year
export const getCurrentYear = (): number => {
  return new Date().getFullYear(); // Returns 2025 in the app's context
};

// Helper function to determine if a date is in the current year
export const isCurrentYear = (date: Date | string): boolean => {
  if (!date) return false;
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.getFullYear() === getCurrentYear();
};

// Function to get the start and end dates for a "This Year" filter
export const getThisYearRange = (): { start: Date; end: Date } => {
  const now = new Date();
  const currentYear = now.getFullYear();
  const start = new Date(currentYear, 0, 1); // January 1st of current year
  const end = new Date(currentYear, 11, 31, 23, 59, 59); // December 31st of current year, end of day
  
  return { start, end };
};
