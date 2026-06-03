"use client";

import * as React from "react";
import { format, parseISO, getDay, addDays } from "date-fns";
import { CalendarIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

function parseDateValue(value?: string): Date | undefined {
  if (!value) return undefined;
  const parsed = parseISO(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

function toDateInputValue(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

function snapToSaturday(date: Date): Date {
  const day = getDay(date);
  if (day === 6) return date;
  if (day === 0) return addDays(date, -1);
  return addDays(date, 6 - day);
}

type DatePickerProps = {
  id?: string;
  name: string;
  placeholder?: string;
  defaultValue?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  weekendOnly?: boolean;
  onValueChange?: (value: string) => void;
};

function DatePicker({
  id,
  name,
  placeholder = "Pick a date",
  defaultValue,
  required,
  disabled,
  className,
  weekendOnly,
  onValueChange,
}: DatePickerProps) {
  const [date, setDate] = React.useState<Date | undefined>(() => {
    const parsed = parseDateValue(defaultValue);
    return weekendOnly && parsed ? snapToSaturday(parsed) : parsed;
  });
  const [open, setOpen] = React.useState(false);

  const handleSelect = (selected: Date | undefined) => {
    const next = weekendOnly && selected ? snapToSaturday(selected) : selected;
    setDate(next);
    onValueChange?.(next ? toDateInputValue(next) : "");
    setOpen(false);
  };

  return (
    <>
      <input
        type="hidden"
        name={name}
        value={date ? toDateInputValue(date) : ""}
        required={required}
      />
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id={id}
            type="button"
            variant="outline"
            disabled={disabled}
            className={cn(
              "h-12 w-full justify-start rounded-lg border-outline-variant bg-surface-container-low px-3 py-2 text-left text-sm font-normal shadow-[inset_0_1px_2px_rgba(0,0,0,0.5)] hover:bg-surface-container-low",
              !date && "text-outline-variant",
              className
            )}
          >
            <CalendarIcon className="size-4 shrink-0" />
            {date ? format(date, "PPP") : <span>{placeholder}</span>}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={date}
            onSelect={handleSelect}
            disabled={
              weekendOnly
                ? (d) => {
                    const day = getDay(d);
                    return day !== 0 && day !== 6;
                  }
                : undefined
            }
            autoFocus
          />
        </PopoverContent>
      </Popover>
    </>
  );
}

export { DatePicker };
