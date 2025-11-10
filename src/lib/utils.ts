import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Get current date in local timezone as YYYY-MM-DD string
 */
export function getLocalDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Format YYYY-MM-DD string to dd/MM/yyyy
 */
export function formatDateString(dateString: string): string {
  if (!dateString) return "-";
  const [y, m, d] = dateString.split("-");
  return `${d}/${m}/${y}`;
}

/**
 * Format YYYY-MM-DD string to MMM/yyyy (Portuguese)
 */
export function formatMonthYear(dateString: string): string {
  if (!dateString) return "-";
  const [y, m] = dateString.split("-");
  const months = [
    "jan", "fev", "mar", "abr", "mai", "jun",
    "jul", "ago", "set", "out", "nov", "dez"
  ];
  return `${months[parseInt(m) - 1]}/${y}`;
}

/**
 * Add days to a YYYY-MM-DD date string
 */
export function addDaysToDateString(dateString: string, days: number): string {
  const [y, m, d] = dateString.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + days);
  
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
