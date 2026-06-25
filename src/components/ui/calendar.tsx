import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker, getDefaultClassNames } from "react-day-picker";

import { cn } from "~/lib/utils";
import { buttonVariants } from "~/components/ui/button";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

function Calendar({ className, classNames, showOutsideDays = true, ...props }: CalendarProps) {
  const defaultClassNames = getDefaultClassNames();

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-1", className)}
      classNames={{
        root: cn(defaultClassNames.root, "w-fit"),
        months: cn(defaultClassNames.months, "flex gap-4"),
        month: cn(defaultClassNames.month, "space-y-3"),
        month_caption: cn(
          defaultClassNames.month_caption,
          "flex items-center justify-center h-9 px-9 text-sm font-semibold text-gray-900"
        ),
        nav: cn(defaultClassNames.nav, "flex items-center justify-between absolute inset-x-1 top-0 h-9"),
        dropdowns: cn(defaultClassNames.dropdowns, "flex items-center gap-1.5"),
        dropdown_root: cn(defaultClassNames.dropdown_root, "relative"),
        dropdown: cn(
          defaultClassNames.dropdown,
          "rounded-lg border border-input bg-white px-2 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        ),
        button_previous: cn(
          buttonVariants({ variant: "outline", size: "icon" }),
          "h-7 w-7 bg-transparent p-0 border-none hover:bg-gray-100"
        ),
        button_next: cn(
          buttonVariants({ variant: "outline", size: "icon" }),
          "h-7 w-7 bg-transparent p-0 border-none hover:bg-gray-100"
        ),
        weekdays: cn(defaultClassNames.weekdays, "flex"),
        weekday: cn(
          defaultClassNames.weekday,
          "w-9 text-center text-xs font-medium text-muted-foreground"
        ),
        week: cn(defaultClassNames.week, "flex w-full mt-1"),
        day: cn(
          defaultClassNames.day,
          "h-9 w-9 text-center text-sm p-0 relative"
        ),
        day_button: cn(
          defaultClassNames.day_button,
          "h-9 w-9 rounded-lg font-normal hover:bg-brand-blue-50 transition-colors"
        ),
        selected: cn(
          defaultClassNames.selected,
          "[&>button]:bg-brand-blue-600 [&>button]:text-white [&>button]:hover:bg-brand-blue-700"
        ),
        today: cn(defaultClassNames.today, "[&>button]:font-semibold [&>button]:text-brand-blue-600"),
        outside: cn(defaultClassNames.outside, "text-muted-foreground opacity-50"),
        disabled: cn(defaultClassNames.disabled, "text-muted-foreground opacity-30"),
        hidden: cn(defaultClassNames.hidden, "invisible"),
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation }) =>
          orientation === "left" ? (
            <ChevronLeft className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          ),
      }}
      {...props}
    />
  );
}

export { Calendar };
