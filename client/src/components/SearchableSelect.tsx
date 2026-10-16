import { useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export interface SearchableOption {
  value: string;
  label: string;
  /** Prefijo opcional, por ejemplo la bandera del país. */
  prefix?: string;
  /** Encabezado bajo el que se agrupa la opción. */
  group?: string;
}

/**
 * Selector con buscador, en el estilo de la aplicación.
 *
 * Un <select> nativo dibuja el desplegable del sistema operativo, que rompe el
 * diseño y además es incómodo con listas largas: elegir una ciudad entre 800
 * obliga a desplazarse a ciegas. Aquí se escribe y la lista se filtra.
 */
export function SearchableSelect({
  value,
  onChange,
  options,
  placeholder,
  searchPlaceholder = "Buscar…",
  emptyText = "Sin resultados",
  disabled = false,
  loading = false,
}: {
  value: string;
  onChange: (value: string) => void;
  options: SearchableOption[];
  placeholder: string;
  searchPlaceholder?: string;
  emptyText?: string;
  disabled?: boolean;
  loading?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);

  // Se conserva el orden en que llegan los grupos, no alfabético.
  const groups: { name: string | undefined; items: SearchableOption[] }[] = [];
  for (const option of options) {
    const last = groups[groups.length - 1];
    if (last && last.name === option.group) last.items.push(option);
    else groups.push({ name: option.group, items: [option] });
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled || loading}
          className={cn(
            "w-full justify-between rounded-xl px-3 py-2.5 h-auto min-h-10 font-normal",
            !selected && "text-muted-foreground"
          )}
        >
          <span className="truncate text-left">
            {loading ? "Cargando…" : selected
              ? `${selected.prefix ? selected.prefix + " " : ""}${selected.label}`
              : placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>

      <PopoverContent
        className="p-0 w-[--radix-popover-trigger-width]"
        align="start"
      >
        <Command>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList className="max-h-64">
            <CommandEmpty>{emptyText}</CommandEmpty>
            {groups.map((group, i) => (
              <CommandGroup key={group.name ?? i} heading={group.name}>
                {group.items.map((o) => (
                  <CommandItem
                    key={o.value}
                    // El buscador filtra por el texto visible, no por el código
                    value={`${o.label} ${o.value}`}
                    onSelect={() => {
                      onChange(o.value === value ? "" : o.value);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === o.value ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {o.prefix && <span className="mr-1.5">{o.prefix}</span>}
                    <span className="truncate">{o.label}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
