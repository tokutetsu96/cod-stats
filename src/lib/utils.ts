import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function calcKD(kills: number, deaths: number) {
  if (deaths === 0) return kills.toFixed(2);
  return (kills / deaths).toFixed(2);
}

const WEEKDAYS = ["\u65E5", "\u6708", "\u706B", "\u6C34", "\u6728", "\u91D1", "\u571F"];

export function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dow = WEEKDAYS[new Date(y, m - 1, d).getDay()];
  return `${y}/${String(m).padStart(2, "0")}/${String(d).padStart(2, "0")} (${dow})`;
}
