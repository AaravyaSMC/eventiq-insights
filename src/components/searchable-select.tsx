import { useState } from "react";
import * as Popover from "@radix-ui/react-popover";
import { Command } from "cmdk";
import { Check, ChevronDown, Search } from "lucide-react";

export type SelectOption = { value: string; label: string };

/** Pill-style filter with a searchable dropdown (cmdk inside a popover). */
export function SearchableSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: SelectOption[];
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger className="flex w-full items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs shadow-soft transition hover:bg-secondary sm:w-auto">
        <span className="shrink-0 font-medium text-muted-foreground">{label}</span>
        <span className="min-w-0 flex-1 truncate text-left font-medium sm:max-w-[140px] sm:flex-none">
          {selected?.label ?? value}
        </span>
        <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={6}
          collisionPadding={12}
          className="z-50 w-[min(18rem,calc(100vw-1.5rem))] overflow-hidden rounded-2xl border border-border bg-popover shadow-hover"
        >
          <Command loop>
            <div className="flex items-center gap-2 border-b border-border px-3">
              <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <Command.Input
                autoFocus
                placeholder={`Search ${label.toLowerCase()}…`}
                className="h-9 w-full bg-transparent text-sm placeholder:text-muted-foreground focus:outline-none"
              />
            </div>
            <Command.List className="max-h-60 overflow-y-auto p-1">
              <Command.Empty className="p-3 text-center text-xs text-muted-foreground">
                No match.
              </Command.Empty>
              {options.map((o) => (
                <Command.Item
                  key={o.value}
                  value={o.label}
                  onSelect={() => {
                    onChange(o.value);
                    setOpen(false);
                  }}
                  className="flex cursor-pointer items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-sm data-[selected=true]:bg-secondary"
                >
                  <span className="truncate">{o.label}</span>
                  {o.value === value && <Check className="h-3.5 w-3.5 shrink-0 text-sky" />}
                </Command.Item>
              ))}
            </Command.List>
          </Command>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
