"use client";

import ReactDatePicker, { registerLocale } from "react-datepicker";
import { ja } from "date-fns/locale";
import "react-datepicker/dist/react-datepicker.css";
import { cn } from "@/lib/utils";

registerLocale("ja", ja);

/** "YYYY-MM-DD" → ローカル時刻の Date（UTC解釈バグ回避） */
function strToDate(str: string): Date {
  const [y, m, d] = str.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** ローカル時刻の Date → "YYYY-MM-DD"（UTC変換バグ回避） */
function dateToStr(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

interface DatePickerProps {
  value: string; // YYYY-MM-DD
  onChange: (value: string) => void;
  className?: string;
}

export function DatePicker({ value, onChange, className }: DatePickerProps) {
  return (
    <ReactDatePicker
      selected={value ? strToDate(value) : null}
      onChange={(date) => date && onChange(dateToStr(date))}
      dateFormat="yyyy/MM/dd (EEE)"
      locale="ja"
      className={cn(
        "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors",
        "placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
        className
      )}
    />
  );
}

/** 今日の日付を "YYYY-MM-DD" で返す（ローカル時刻基準） */
export function todayStr(): string {
  return dateToStr(new Date());
}
