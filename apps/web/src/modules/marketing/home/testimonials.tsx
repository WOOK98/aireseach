"use client";

import { useTranslation } from "@workspace/i18n";
import { cn } from "@workspace/ui";
import { useBreakpoint } from "@workspace/ui-web";
import { Avatar, AvatarFallback, AvatarImage } from "@workspace/ui-web/avatar";
import { Icons } from "@workspace/ui-web/icons";
import { Marquee } from "@workspace/ui-web/marquee";

import {
  Section,
  SectionDescription,
  SectionHeader,
} from "~/modules/marketing/layout/section";
import { SectionBadge } from "~/modules/marketing/layout/section";
import { SectionTitle } from "~/modules/marketing/layout/section";

const reviews = [
  {
    name: "testimonials.reviews.jack.name",
    body: "testimonials.reviews.jack.body",
    img: "https://avatar.vercel.sh/jack",
    position: "testimonials.reviews.jack.position",
  },
  {
    name: "testimonials.reviews.jill.name",
    body: "testimonials.reviews.jill.body",
    img: "https://avatar.vercel.sh/jill",
    position: "testimonials.reviews.jill.position",
  },
  {
    name: "testimonials.reviews.john.name",
    body: "testimonials.reviews.john.body",
    img: "https://avatar.vercel.sh/john",
    position: "testimonials.reviews.john.position",
  },
  {
    name: "testimonials.reviews.sarah.name",
    body: "testimonials.reviews.sarah.body",
    img: "https://avatar.vercel.sh/sarah",
    position: "testimonials.reviews.sarah.position",
  },
  {
    name: "testimonials.reviews.mike.name",
    body: "testimonials.reviews.mike.body",
    img: "https://avatar.vercel.sh/mike",
    position: "testimonials.reviews.mike.position",
  },
] as const;

type Review = (typeof reviews)[number];

export const Testimonials = () => {
  const { t } = useTranslation("marketing");
  const isDesktop = useBreakpoint("md");

  const rows = isDesktop
    ? [reviews.slice(0, reviews.length / 2), reviews.slice(reviews.length / 2)]
    : [reviews];

  return (
    <Section id="testimonials" className="lg:flex-row lg:items-start">
      <SectionHeader className="grow basis-0 lg:items-start">
        <SectionBadge>{t("testimonials.label")}</SectionBadge>
        <SectionTitle className="lg:text-left">
          {t("testimonials.title")}
        </SectionTitle>
        <SectionDescription className="lg:text-left">
          {t("testimonials.description")}
        </SectionDescription>
        <div className="flex flex-row items-center gap-0.5">
          {Array.from({ length: 5 }).map((_, index) => (
            <Icons.Star
              key={index}
              className="fill-yellow-500 text-yellow-500"
            />
          ))}
          <p className="ml-2 text-sm font-medium">
            {t("testimonials.rating", {
              rating: 4.9,
              count: reviews.length,
            })}
          </p>
        </div>
      </SectionHeader>

      <div className="relative flex h-[600px] grow flex-row items-center justify-center overflow-hidden lg:basis-0">
        {rows.map((row, index) => (
          <Marquee
            key={index}
            pauseOnHover
            vertical
            className="[--duration:20s]"
            reverse={index % 2 !== 0}
          >
            {row.map((review) => (
              <ReviewCard key={review.name} {...review} />
            ))}
          </Marquee>
        ))}
        <div className="from-background pointer-events-none absolute inset-x-0 top-0 h-1/4 bg-gradient-to-b"></div>
        <div className="from-background pointer-events-none absolute inset-x-0 bottom-0 h-1/4 bg-gradient-to-t"></div>
      </div>
    </Section>
  );
};

const ReviewCard = ({ img, name, position, body }: Review) => {
  const { t } = useTranslation("marketing");
  return (
    <figure
      className={cn(
        "bg-card hover:bg-accent/50 relative h-full w-full cursor-pointer overflow-hidden rounded-xl border p-4",
      )}
    >
      <div className="flex flex-row items-center gap-2">
        <Avatar className="size-8">
          <AvatarImage src={img} alt={name} />
          <AvatarFallback className="uppercase">
            {t(name).slice(0, 2)}
          </AvatarFallback>
        </Avatar>
        <div className="flex flex-col">
          <figcaption className="text-sm font-medium">{t(name)}</figcaption>
          <p className="text-muted-foreground text-xs leading-tight font-medium">
            {t(position)}
          </p>
        </div>
      </div>
      <blockquote className="mt-2 text-sm">{t(body)}</blockquote>
    </figure>
  );
};
