import { cva } from "class-variance-authority";
import * as React from "react";
import { View } from "react-native";

import { cn } from "@workspace/ui";

import { Text, TextClassContext } from "#components/text";

import type { Icon } from "#components/icons";
import type { VariantProps } from "class-variance-authority";
import type { ViewProps } from "react-native";

const alertVariants = cva(
  "bg-card border-border relative w-full rounded-lg border px-4 pt-3.5 pb-2",
  {
    variants: {
      variant: {
        default: "bg-card border-border",
        destructive: "border-destructive/20 bg-destructive/5",
        primary: "border-primary/20 bg-primary/5",
        success: "border-success/20 bg-success/5",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

const alertTextVariants = cva("text-sm", {
  variants: {
    variant: {
      default: "text-foreground",
      destructive: "text-destructive",
      primary: "text-primary",
      success: "text-success",
    },
  },
  defaultVariants: {
    variant: "default",
  },
});

const alertDescriptionVariants = cva("ml-0.5 pb-1.5 pl-6 text-sm", {
  variants: {
    variant: {
      default: "text-muted-foreground",
      destructive: "text-destructive/90",
      primary: "text-primary/90",
      success: "text-success/90",
    },
  },
  defaultVariants: {
    variant: "default",
  },
});

const AlertContext =
  React.createContext<VariantProps<typeof alertVariants>["variant"]>(null);

function Alert({
  className,
  variant,
  children,
  icon: Icon,
  iconClassName,
  ...props
}: ViewProps &
  React.RefAttributes<View> &
  VariantProps<typeof alertVariants> & {
    icon?: Icon;
    iconClassName?: string;
  }) {
  return (
    <AlertContext.Provider value={variant}>
      <TextClassContext.Provider
        value={cn(alertTextVariants({ variant }), className)}
      >
        <View
          role="alert"
          className={cn(alertVariants({ variant }), className)}
          {...props}
        >
          {Icon && (
            <View className="absolute top-3 left-3.5">
              <Icon
                className={cn(alertTextVariants({ variant }), iconClassName)}
                size={16}
              />
            </View>
          )}
          {children}
        </View>
      </TextClassContext.Provider>
    </AlertContext.Provider>
  );
}

function AlertTitle({
  className,
  ...props
}: React.ComponentProps<typeof Text> & React.RefAttributes<Text>) {
  return (
    <Text
      className={cn(
        "font-sans-medium ml-0.5 min-h-4 pl-6 leading-none tracking-tight",
        className,
      )}
      {...props}
    />
  );
}

function AlertDescription({
  className,
  ...props
}: React.ComponentProps<typeof Text> & React.RefAttributes<Text>) {
  const variant = React.useContext(AlertContext);

  return (
    <Text
      className={cn(alertDescriptionVariants({ variant }), className)}
      {...props}
    />
  );
}

export { Alert, AlertDescription, AlertTitle };
