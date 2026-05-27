import { TextInput } from "react-native";

import { cn } from "@workspace/ui";

import type { TextInputProps } from "react-native";

function Textarea({
  className,
  multiline = true,
  numberOfLines = 8,
  placeholderTextColorClassName,
  selectionColorClassName,
  ...props
}: TextInputProps & React.RefAttributes<TextInput>) {
  return (
    <TextInput
      className={cn(
        "text-foreground border-input dark:bg-input/30 flex min-h-16 w-full flex-row rounded-md border bg-transparent px-3 py-2 font-sans text-base shadow-sm shadow-black/5",
        props.editable === false && "opacity-50",
        className,
      )}
      placeholderTextColorClassName={cn(
        "accent-muted-foreground",
        placeholderTextColorClassName,
      )}
      selectionColorClassName={cn("accent-foreground", selectionColorClassName)}
      multiline={multiline}
      numberOfLines={numberOfLines}
      textAlignVertical="top"
      {...props}
    />
  );
}

export { Textarea };
