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
      {/* VibeLoft Web Telemetry — renders only when the web auth key is
          configured (VIBELOFT_AUTH_KEY, sensitive env in Vercel). This
          layout is a Server Component, so the key is read server-side and
          emitted only as the script tag's data attribute (required by the
          telemetry contract). The browser loads only
          vibeloft.ai/telemetry/v1.js and posts events to api.vibeloft.ai;
          no other endpoints. */}
      {process.env.VIBELOFT_AUTH_KEY ? (
        <Script
          src="https://vibeloft.ai/telemetry/v1.js"
          strategy="afterInteractive"
          data-vl-product-id="58a0f785-70cd-478d-bde1-c3c0fe16c9e7"
          data-vl-auth-key={process.env.VIBELOFT_AUTH_KEY}
        />
      ) : null}
      <OrganizationJsonLd />
      <WebsiteJsonLd />
      {children}
    </>
  );
}
