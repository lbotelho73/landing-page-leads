
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

/**
 * Format a date to display in a human-readable format (dd/mm/yyyy)
 */
export const formatDate = (date: string | Date | null | undefined): string => {
  if (!date) return "";
  try {
    return format(new Date(date), "dd/MM/yyyy", { locale: ptBR });
  } catch (error) {
    console.error("Error formatting date:", error);
    return String(date);
  }
};

/**
 * Format a time string to display in a human-readable format (HH:MM)
 */
export const formatTimeDisplay = (time: string | null | undefined): string => {
  if (!time) return "";
  return time;
};

/**
 * Format a number as currency (BRL)
 */
export const formatCurrency = (value: number | null | undefined): string => {
  if (value === null || value === undefined) return "";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
};

/**
 * Format a percentage value
 */
export const formatPercentage = (value: number | null | undefined): string => {
  if (value === null || value === undefined) return "";
  return `${value}%`;
};

/**
 * Format a phone number to Brazilian format
 */
export const formatPhone = (phone: string | null | undefined): string => {
  if (!phone) return "";
  
  // Remove all non-numeric characters
  const cleanNumber = phone.replace(/\D/g, "");
  
  // Format based on length
  if (cleanNumber.length === 11) {
    // Mobile: (xx) x xxxx-xxxx
    return `(${cleanNumber.substring(0, 2)}) ${cleanNumber.substring(2, 3)} ${cleanNumber.substring(3, 7)}-${cleanNumber.substring(7, 11)}`;
  } else if (cleanNumber.length === 10) {
    // Landline: (xx) xxxx-xxxx
    return `(${cleanNumber.substring(0, 2)}) ${cleanNumber.substring(2, 6)}-${cleanNumber.substring(6, 10)}`;
  }
  
  // Return as is if not matching expected patterns
  return phone;
};
