import { Img, Link, Text } from "react-email";

import { env } from "../../../env";

interface FooterProps {
  readonly origin: string;
}

export const Footer = ({ origin }: FooterProps) => {
  return (
    <>
      <Img
        src={`${origin}/images/logo.png`}
        alt="Turbostarter Logo"
        height={45}
        className="mt-12"
      />
      <Text className="text-muted-foreground max-w-[250px] leading-normal">
        <Link
          href="https://turbostarter.dev"
          className="text-muted-foreground"
          style={{ textDecoration: "underline" }}
        >
          {env.PRODUCT_NAME}
        </Link>
      </Text>
    </>
  );
};
