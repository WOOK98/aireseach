import * as Slot from "@rn-primitives/slot";
import * as React from "react";
import { Text as RNText } from "react-native";

import { cn } from "@workspace/ui";

const TextClassContext = React.createContext<string | undefined>(undefined);

const Text = ({
  className,
  asChild = false,
  ...props
}: React.ComponentProps<typeof RNText> &
  React.RefAttributes<RNText> & {
    asChild?: boolean;
  }) => {
  const textClass = React.useContext(TextClassContext);
  const Component = asChild ? Slot.Text : RNText;
  return (
    <Component
      className={cn(
        "text-foreground font-sans text-base",
        textClass,
        className,
      )}
      {...props}
    />
  );
};

export { Text, TextClassContext };
