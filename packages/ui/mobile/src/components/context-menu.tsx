import { View } from "react-native";
import * as ContextMenuPrimitive from "zeego/context-menu";

export const ContextMenu = ContextMenuPrimitive.Root;

export const ContextMenuTrigger = ContextMenuPrimitive.create(
  (props: React.ComponentProps<typeof ContextMenuPrimitive.Trigger>) => (
    <ContextMenuPrimitive.Trigger {...props} asChild>
      <View>{props.children}</View>
    </ContextMenuPrimitive.Trigger>
  ),
  "Trigger",
);

export const ContextMenuContent = ContextMenuPrimitive.create(
  (props: React.ComponentProps<typeof ContextMenuPrimitive.Content>) => (
    <ContextMenuPrimitive.Content {...props} />
  ),
  "Content",
);

export const ContextMenuItem = ContextMenuPrimitive.create(
  (props: React.ComponentProps<typeof ContextMenuPrimitive.Item>) => (
    <ContextMenuPrimitive.Item {...props} />
  ),
  "Item",
);

export const ContextMenuItemTitle = ContextMenuPrimitive.create(
  (props: React.ComponentProps<typeof ContextMenuPrimitive.ItemTitle>) => (
    <ContextMenuPrimitive.ItemTitle {...props} />
  ),
  "ItemTitle",
);

export const ContextMenuItemIcon = ContextMenuPrimitive.create(
  (props: React.ComponentProps<typeof ContextMenuPrimitive.ItemIcon>) => (
    <ContextMenuPrimitive.ItemIcon {...props} />
  ),
  "ItemIcon",
);

export const ContextMenuItemImage: React.ComponentType<
  React.ComponentProps<typeof ContextMenuPrimitive.ItemImage>
> = ContextMenuPrimitive.create(
  (props: React.ComponentProps<typeof ContextMenuPrimitive.ItemImage>) => (
    <ContextMenuPrimitive.ItemImage {...props} />
  ),
  "ItemImage",
);

export const ContextMenuCheckboxItem = ContextMenuPrimitive.create(
  (props: React.ComponentProps<typeof ContextMenuPrimitive.CheckboxItem>) => (
    <ContextMenuPrimitive.CheckboxItem {...props} />
  ),
  "CheckboxItem",
);

export const ContextMenuLabel = ContextMenuPrimitive.create(
  (props: React.ComponentProps<typeof ContextMenuPrimitive.Label>) => (
    <ContextMenuPrimitive.Label {...props} />
  ),
  "Label",
);

export const ContextMenuSeparator = ContextMenuPrimitive.create(
  (props: React.ComponentProps<typeof ContextMenuPrimitive.Separator>) => (
    <ContextMenuPrimitive.Separator {...props} />
  ),
  "Separator",
);

export const ContextMenuGroup = ContextMenuPrimitive.create(
  (props: React.ComponentProps<typeof ContextMenuPrimitive.Group>) => (
    <ContextMenuPrimitive.Group {...props} />
  ),
  "Group",
);

export const ContextMenuSubTrigger = ContextMenuPrimitive.create(
  (props: React.ComponentProps<typeof ContextMenuPrimitive.SubTrigger>) => (
    <ContextMenuPrimitive.SubTrigger {...props} />
  ),
  "SubTrigger",
);

export const ContextMenuSubContent = ContextMenuPrimitive.create(
  (props: React.ComponentProps<typeof ContextMenuPrimitive.SubContent>) => (
    <ContextMenuPrimitive.SubContent {...props} />
  ),
  "SubContent",
);

export const ContextMenuSub = ContextMenuPrimitive.create(
  (props: React.ComponentProps<typeof ContextMenuPrimitive.Sub>) => (
    <ContextMenuPrimitive.Sub {...props} />
  ),
  "Sub",
);

export const ContextMenuItemIndicator = ContextMenuPrimitive.create(
  (props: React.ComponentProps<typeof ContextMenuPrimitive.ItemIndicator>) => (
    <ContextMenuPrimitive.ItemIndicator {...props} />
  ),
  "ItemIndicator",
);

export const ContextMenuPreview: React.ComponentType<
  React.ComponentProps<typeof ContextMenuPrimitive.Preview>
> = ContextMenuPrimitive.create(
  (props: React.ComponentProps<typeof ContextMenuPrimitive.Preview>) => (
    <ContextMenuPrimitive.Preview {...props} />
  ),
  "Preview",
);

export const ContextMenuArrow = ContextMenuPrimitive.create(
  (props: React.ComponentProps<typeof ContextMenuPrimitive.Arrow>) => (
    <ContextMenuPrimitive.Arrow {...props} />
  ),
  "Arrow",
);
