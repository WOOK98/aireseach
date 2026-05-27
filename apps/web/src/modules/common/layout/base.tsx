import { Geist_Mono, Geist } from "next/font/google";

import { cn } from "@workspace/ui";

import { appConfig } from "~/config/app";

const sans = Geist({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans",
});

const mono = Geist_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-mono",
  weight: ["300", "400", "500"],
});

interface BaseLayoutProps {
  readonly locale: string;
  readonly children: React.ReactNode;
}

export const BaseLayout = ({ children, locale }: BaseLayoutProps) => {
  return (
    <html
      lang={locale}
      className={cn(sans.variable, mono.variable)}
      data-scroll-behavior="smooth"
    >
      <body
        suppressHydrationWarning
        className="bg-background text-foreground flex min-h-screen flex-col font-sans antialiased"
        data-theme={appConfig.theme.color}
      >
        {children}
      </body>
    </html>
  );
};
