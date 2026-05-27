import * as TabsPrimitive from "@rn-primitives/tabs";
import * as React from "react";

import { cn } from "@workspace/ui";

import { TextClassContext } from "./text";

function Tabs({
  className,
  ...props
}: TabsPrimitive.RootProps & React.RefAttributes<TabsPrimitive.RootRef>) {
  return (
    <TabsPrimitive.Root
      className={cn("flex flex-col gap-2", className)}
      {...props}
    />
  );
}

function TabsList({
  className,
  ...props
}: TabsPrimitive.ListProps & React.RefAttributes<TabsPrimitive.ListRef>) {
  return (
    <TabsPrimitive.List
      className={cn(
        "bg-muted mr-auto flex h-10 flex-row items-center justify-center rounded-lg p-[3px]",
        className,
      )}
      {...props}
    />
  );
}

function TabsTrigger({
  className,
  ...props
}: TabsPrimitive.TriggerProps & React.RefAttributes<TabsPrimitive.TriggerRef>) {
  const { value } = TabsPrimitive.useRootContext();
  return (
    <TextClassContext.Provider
      value={cn(
        "text-foreground dark:text-muted-foreground font-sans-medium text-sm",
        value === props.value && "dark:text-foreground",
      )}
    >
      <TabsPrimitive.Trigger
        className={cn(
          "flex flex-row items-center justify-center gap-1.5 rounded-md border border-transparent px-2 py-1.5 shadow-none shadow-black/5",
          props.disabled && "opacity-50",
          props.value === value &&
            "bg-background dark:border-foreground/10 dark:bg-input/30 shadow-sm",
          className,
        )}
        {...props}
      />
    </TextClassContext.Provider>
  );
}

const TabsContent = TabsPrimitive.Content;

export { Tabs, TabsContent, TabsList, TabsTrigger };
