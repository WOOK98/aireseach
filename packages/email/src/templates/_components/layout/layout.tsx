import { oklch, formatHex } from "culori";
import { Container, Font, Head, Html, Section, Tailwind } from "react-email";

import { mapValues } from "@workspace/shared/utils";
import { themes, ThemeMode } from "@workspace/ui";

import { env } from "../../../env";
import { Footer } from "./footer";
import { Header } from "./header";

import type { PropsWithChildren } from "react";

const variables = themes[env.EMAIL_THEME][ThemeMode.LIGHT];
const colors = mapValues(variables, ([l, c, h, alpha]) =>
  formatHex(
    oklch({
      mode: "oklch",
      l,
      c,
      h,
      alpha,
    }),
  ),
);

export const Layout = ({
  children,
  origin,
  locale,
}: PropsWithChildren<{ origin?: string | null; locale?: string }>) => {
  return (
    <Html lang={locale}>
      <Head>
        <Font
          fontFamily="Geist"
          fallbackFontFamily="Arial"
          fontWeight={400}
          fontStyle="normal"
          webFont={{
            url: "https://fonts.gstatic.com/s/geist/v3/gyByhwUxId8gMEwYGFWNOITddY4.woff2",
            format: "woff2",
          }}
        />
      </Head>
      <Tailwind
        config={{
          theme: {
            extend: {
              colors,
            },
          },
        }}
      >
        <Section className="p-1">
          <Container className="bg-card text-card-foreground rounded-lg p-6">
            {origin && <Header origin={origin} />}
            {children}
            {origin && <Footer origin={origin} />}
          </Container>
        </Section>
      </Tailwind>
    </Html>
  );
};
