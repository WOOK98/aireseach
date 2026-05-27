import * as SwitchPrimitives from "@rn-primitives/switch";

import { cn } from "@workspace/ui";

function Switch({
  className,
  ...props
}: SwitchPrimitives.RootProps & React.RefAttributes<SwitchPrimitives.RootRef>) {
  return (
    <SwitchPrimitives.Root
      className={cn(
        "flex h-7 w-12 shrink-0 flex-row items-center rounded-full border border-transparent shadow-sm shadow-black/5",
        props.checked ? "bg-primary" : "bg-input dark:bg-input/80",
        props.disabled && "opacity-50",
        className,
      )}
      {...props}
    >
      <SwitchPrimitives.Thumb
        className={cn(
          "bg-background size-6 rounded-full transition-transform",
          props.checked
            ? "dark:bg-primary-foreground translate-x-5"
            : "dark:bg-foreground translate-x-0",
        )}
      />
    </SwitchPrimitives.Root>
  );
}

export { Switch };
