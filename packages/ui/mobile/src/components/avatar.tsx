import * as AvatarPrimitive from "@rn-primitives/avatar";
import * as React from "react";

import { cn } from "@workspace/ui";

function Avatar({
  className,
  ...props
}: AvatarPrimitive.RootProps & React.RefAttributes<AvatarPrimitive.RootRef>) {
  return (
    <AvatarPrimitive.Root
      className={cn(
        "relative flex size-9 shrink-0 overflow-hidden rounded-full",
        className,
      )}
      {...props}
    />
  );
}
function AvatarImage({
  className,
  ...props
}: AvatarPrimitive.ImageProps & React.RefAttributes<AvatarPrimitive.ImageRef>) {
  return (
    <AvatarPrimitive.Image
      className={cn("aspect-square size-full", className)}
      {...props}
    />
  );
}

function AvatarFallback({
  className,
  ...props
}: AvatarPrimitive.FallbackProps &
  React.RefAttributes<AvatarPrimitive.FallbackRef>) {
  return (
    <AvatarPrimitive.Fallback
      className={cn(
        "bg-muted border-border flex size-full flex-row items-center justify-center rounded-full border",
        className,
      )}
      {...props}
    />
  );
}
export { Avatar, AvatarFallback, AvatarImage };
