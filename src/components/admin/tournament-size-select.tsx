"use client";

import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const BRACKET_SIZES = [2, 4, 8, 16, 32, 64];

/** A shadcn Select for the tournament's bracket size, wired into a plain
 *  <form action={...}> the same way DatePicker is — a hidden input carries
 *  the value so the native form submission still works. */
export function TournamentSizeSelect({
  id,
  name,
  defaultValue = 8,
}: {
  id?: string;
  name: string;
  defaultValue?: number;
}) {
  const [value, setValue] = useState(String(defaultValue));

  return (
    <>
      <input type="hidden" name={name} value={value} required />
      <Select value={value} onValueChange={setValue}>
        <SelectTrigger id={id} className="h-12">
          <SelectValue placeholder="Bracket size" />
        </SelectTrigger>
        <SelectContent>
          {BRACKET_SIZES.map((n) => (
            <SelectItem key={n} value={String(n)}>
              {n} teams
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </>
  );
}
