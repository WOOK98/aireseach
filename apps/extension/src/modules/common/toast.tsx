import { Toaster as Sonner } from "sonner";

import { StorageKey, useStorage } from "~/lib/storage";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { data: theme } = useStorage(StorageKey.THEME);

  return (
    <Sonner
      theme={theme.mode}
      className="toaster group"
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
        } as React.CSSProperties
      }
      {...props}
    />
  );
};

export { Toaster };
