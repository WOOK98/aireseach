import * as CheckboxPrimitive from "@rn-primitives/checkbox";

import { cn } from "@workspace/ui";

import { Icons } from "./icons";

const DEFAULT_HIT_SLOP = 24;

function Checkbox({
  className,
  checkedClassName,
  indicatorClassName,
  iconClassName,
  ...props
}: CheckboxPrimitive.RootProps &
  React.RefAttributes<CheckboxPrimitive.RootRef> & {
    checkedClassName?: string;
    indicatorClassName?: string;
    iconClassName?: string;
  }) {
  return (
    <CheckboxPrimitive.Root
      className={cn(
        "border-input dark:bg-input/30 size-4 shrink-0 overflow-hidden rounded-[4px] border shadow-sm shadow-black/5",
        props.checked && cn("border-primary", checkedClassName),
        props.disabled && "opacity-50",
        className,
      )}
      hitSlop={DEFAULT_HIT_SLOP}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        className={cn(
          "bg-primary h-full w-full items-center justify-center",
          indicatorClassName,
        )}
      >
        <Icons.Check
          size={12}
          strokeWidth={3.5}
          className={cn("text-primary-foreground", iconClassName)}
        />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}

export { Checkbox };
