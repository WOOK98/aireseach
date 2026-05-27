import * as LabelPrimitive from "@rn-primitives/label";

import { cn } from "@workspace/ui";

function Label({
  className,
  onPress,
  onLongPress,
  onPressIn,
  onPressOut,
  disabled,
  ...props
}: LabelPrimitive.TextProps & React.RefAttributes<LabelPrimitive.TextRef>) {
  return (
    <LabelPrimitive.Root
      className={cn(
        "flex flex-row items-center gap-2 select-none",
        disabled && "opacity-50",
      )}
      onPress={onPress}
      onLongPress={onLongPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      disabled={disabled}
    >
      <LabelPrimitive.Text
        className={cn(
          "text-foreground native:leading-tight font-sans-medium text-sm",
          className,
        )}
        {...props}
      />
    </LabelPrimitive.Root>
  );
}

export { Label };
