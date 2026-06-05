import "~/assets/styles/globals.css";
import Script from "next/script";

import { DEFAULT_VIEWPORT, DEFAULT_METADATA } from "~/lib/metadata";
import {
  OrganizationJsonLd,
  WebsiteJsonLd,
} from "~/modules/marketing/layout/json-ld";

import type { Metadata } from "next";

export const viewport = DEFAULT_VIEWPORT;

export const metadata: Metadata = {
  ...DEFAULT_METADATA,
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/apple-icon.png",
  },
};

// Since we have a `not-found.tsx` page on the root, a layout file
// is required, even if it's just passing children through.
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {/* Preconnect to critical third-party origins */}
      <link
        rel="preconnect"
        href="https://www.googletagmanager.com"
        crossOrigin="anonymous"
      />
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link
        rel="preconnect"
        href="https://fonts.gstatic.com"
        crossOrigin="anonymous"
      />
      {/* GA4 — lazy load to avoid blocking render */}
      <Script
        src="https://www.googletagmanager.com/gtag/js?id=G-9TWC725PD2"
        strategy="lazyOnload"
      />
      <Script id="google-analytics" strategy="lazyOnload">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', 'G-9TWC725PD2');
        `}
      </Script>
      <OrganizationJsonLd />
      <WebsiteJsonLd />
      {children}
    </>
  );
}
