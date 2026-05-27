import { motion } from "motion/react";
import { memo } from "react";

import { useTranslation } from "@workspace/i18n";
import { Button } from "@workspace/ui-web/button";

import type { ForwardRefComponent, SVGMotionProps } from "motion/react";

const Path = (
  props: React.ComponentProps<
    ForwardRefComponent<SVGPathElement, SVGMotionProps<SVGPathElement>>
  >,
) => (
  <motion.path
    fill="transparent"
    strokeWidth="2"
    className="stroke-foreground"
    strokeLinecap="round"
    layout
    {...props}
  />
);

interface HamburgerProps extends React.ComponentProps<typeof Button> {
  readonly open: boolean;
}

export const Hamburger = memo<HamburgerProps>(({ open, ...props }) => {
  const { t } = useTranslation("common");
  return (
    <Button variant="ghost" size="icon" {...props}>
      <span className="sr-only">
        {open ? t("close") : t("open")} {t("menu")}
      </span>
      <svg viewBox="0 0 22 20" className="size-5">
        <Path
          initial="closed"
          animate={open ? "open" : "closed"}
          variants={{
            closed: { d: "M 2 4 L 20 4" },
            open: { d: "M 3 15.5 L 16 4" },
          }}
        />
        <Path
          d="M 2 10 L 20 10"
          animate={open ? "open" : "closed"}
          variants={{
            closed: { opacity: 1 },
            open: { opacity: 0 },
          }}
          transition={{ duration: 0.1 }}
        />
        <Path
          initial="closed"
          animate={open ? "open" : "closed"}
          variants={{
            closed: { d: "M 2 16 L 20 16" },
            open: { d: "M 3 4 L 16 16" },
          }}
        />
      </svg>
    </Button>
  );
});

Hamburger.displayName = "Hamburger";
