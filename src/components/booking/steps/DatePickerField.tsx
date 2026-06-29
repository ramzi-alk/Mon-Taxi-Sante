import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { Button } from "~/components/ui/button";
import { Calendar } from "~/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "~/components/ui/popover";
import { cn } from "~/lib/utils";

export function toDateStr(date: Date) {
  return format(date, "yyyy-MM-dd");
}

interface DatePickerFieldProps {
  id: string;
  value: string | undefined;
  onChange: (value: string) => void;
  disabledBefore: Date;
  placeholder?: string;
  invalid?: boolean;
  describedBy?: string;
}

export function DatePickerField({
  id,
  value,
  onChange,
  disabledBefore,
  placeholder = "Choisir une date",
  invalid,
  describedBy,
}: DatePickerFieldProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          aria-describedby={describedBy}
          aria-invalid={invalid}
          className={cn(
            "h-auto w-full justify-start rounded-xl px-4 py-3.5 text-left text-base font-normal",
            invalid && "border-red-500",
            !value && "text-muted-foreground"
          )}
        >
          {value
            ? format(parseISO(value), "EEEE d MMMM yyyy", { locale: fr })
            : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-2" align="start">
        <Calendar
          mode="single"
          autoFocus
          locale={fr}
          selected={value ? parseISO(value) : undefined}
          onSelect={(date) => date && onChange(toDateStr(date))}
          disabled={{ before: disabledBefore }}
        />
      </PopoverContent>
    </Popover>
  );
}
