
import { format, isValid } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Format currency values
export const formatCurrency = (value: number | string): string => {
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(numValue);
};

// Format dates in Brazilian format
export const formatDate = (date: Date | string | null, formatStr: string = 'dd/MM/yyyy'): string => {
  if (!date) return '';
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  if (!isValid(dateObj)) return '';
  
  return format(dateObj, formatStr, { locale: ptBR });
};

// Format long dates with day of week for display
export const formatLongDate = (date: Date | string | null): string => {
  return formatDate(date, "EEEE, dd 'de' MMMM 'de' yyyy");
};

// Format time for display (convert from HH:MM:SS to HH:MM if needed)
export const formatTimeDisplay = (time: string | null): string => {
  if (!time) return '';
  
  // If already in HH:MM format, return as is
  if (/^\d{1,2}:\d{2}$/.test(time)) {
    return time;
  }
  
  // If in HH:MM:SS format, strip off seconds
  const matches = time.match(/^(\d{1,2}:\d{2}):\d{2}$/);
  if (matches) {
    return matches[1];
  }
  
  return time;
};

// Format date and time together
export const formatDateTime = (date: string | Date | null, time: string | null): string => {
  if (!date) return '';
  
  const formattedDate = formatDate(date);
  const formattedTime = formatTimeDisplay(time);
  
  return formattedTime ? `${formattedDate} às ${formattedTime}` : formattedDate;
};

// Format percentage values
export const formatPercentage = (value: number): string => {
  return `${value}%`;
};
