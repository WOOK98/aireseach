import { useState } from "react";

import { useTranslation } from "@workspace/i18n";
import { cn } from "@workspace/ui";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@workspace/ui-web/accordion";
import { buttonVariants } from "@workspace/ui-web/button";
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuList,
  navigationMenuTriggerStyle,
} from "@workspace/ui-web/navigation-menu";
import { Sheet, SheetContent, SheetTrigger } from "@workspace/ui-web/sheet";

import { pathsConfig } from "~/config/paths";
import { TurboLink } from "~/modules/common/turbo-link";
import { CtaButton } from "~/modules/marketing/layout/cta-button";

import { Hamburger } from "./hamburger";
import { Item } from "./navigation";

import type { NavigationProps } from "./types";

export const MobileNavigation = ({ links }: NavigationProps) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={(props, state) => (
          <Hamburger open={state.open} className="lg:hidden" {...props} />
        )}
      />
      <SheetContent
        side="top"
        showCloseButton={false}
        className="z-30 rounded-b-md px-[1.7rem] pb-6 data-[side=top]:top-14 sm:px-8"
        overlay={{ className: "top-14 z-30" }}
      >
        <NavigationMenu className="w-full max-w-full py-2 [&>div]:w-full">
          <NavigationMenuList className="-mx-4 flex-col space-y-1">
            {links.map((link) => (
              <NavigationMenuItem key={link.label} className="w-full">
                {"items" in link ? (
                  <Accordion>
                    <AccordionItem value="item-1">
                      <AccordionTrigger
                        className={cn(
                          navigationMenuTriggerStyle(),
                          "justify-between text-base font-medium hover:no-underline",
                        )}
                      >
                        {t(link.label)}
                      </AccordionTrigger>
                      <AccordionContent className="py-2 [&_a]:no-underline">
                        <ul className="flex flex-col">
                          {link.items.map((item) => (
                            <Item
                              key={item.title}
                              {...item}
                              onClick={() => setOpen(false)}
                            />
                          ))}
                        </ul>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                ) : (
                  <TurboLink
                    href={link.href}
                    className={cn(
                      navigationMenuTriggerStyle(),
                      "w-full justify-start text-base font-medium",
                    )}
                    onClick={() => setOpen(false)}
                  >
                    {t(link.label)}
                  </TurboLink>
                )}
              </NavigationMenuItem>
            ))}
          </NavigationMenuList>
        </NavigationMenu>

        <div className="flex w-full flex-col gap-2">
          <TurboLink
            href={pathsConfig.marketing.contact}
            className={buttonVariants({ variant: "outline" })}
            onClick={() => setOpen(false)}
          >
            {t("marketing:contact.cta")}
          </TurboLink>
          <CtaButton />
        </div>
      </SheetContent>
    </Sheet>
  );
};
