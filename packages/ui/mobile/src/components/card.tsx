import * as React from "react";
import { View } from "react-native";

import { cn } from "@workspace/ui";

import { TextClassContext, Text } from "./text";

import type { TextRef, ViewRef } from "@rn-primitives/types";
import type { ViewProps } from "react-native";

function Card({ className, ...props }: ViewProps & React.RefAttributes<View>) {
  return (
    <TextClassContext.Provider value="text-card-foreground">
      <View
        className={cn("border-border bg-card rounded-lg border", className)}
        {...props}
      />
    </TextClassContext.Provider>
  );
}

function CardHeader({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof View> & React.RefAttributes<ViewRef>) {
  return (
    <View className={cn("flex flex-col gap-1 p-5", className)} {...props} />
  );
}

function CardTitle({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof Text> & React.RefAttributes<TextRef>) {
  return (
    <Text
      role="heading"
      aria-level={3}
      className={cn(
        "font-sans-medium text-card-foreground text-lg leading-tight tracking-tight",
        className,
      )}
      {...props}
    />
  );
}

function CardDescription({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof Text> & React.RefAttributes<TextRef>) {
  return (
    <Text
      className={cn("text-muted-foreground text-sm", className)}
      {...props}
    />
  );
}

function CardContent({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof View> & React.RefAttributes<ViewRef>) {
  return <View className={cn("p-5 pt-0", className)} {...props} />;
}

function CardFooter({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof View> & React.RefAttributes<ViewRef>) {
  return (
    <View
      className={cn("flex flex-row items-center p-5 pt-0", className)}
      {...props}
    />
  );
}

export {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
};
