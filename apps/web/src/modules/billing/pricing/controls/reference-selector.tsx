import { useTranslation } from "react-i18next";

import { BillingReference } from "@workspace/billing";
import { Avatar, AvatarImage, AvatarFallback } from "@workspace/ui-web/avatar";
import { Icons } from "@workspace/ui-web/icons";
import { Label } from "@workspace/ui-web/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui-web/select";

import { authClient } from "~/lib/auth/client";

import { usePricingControls } from ".";

export const ReferenceSelector = () => {
  const { t } = useTranslation(["common", "auth"]);
  const { controls, setControls } = usePricingControls();

  const session = authClient.useSession();
  const { data: organizations } = authClient.useListOrganizations();

  const organizationsItems = organizations?.map((organization) => ({
    label: (
      <div className="flex min-w-0 items-center gap-2">
        <Avatar size="sm">
          <AvatarImage
            src={organization.logo ?? undefined}
            alt={organization.name}
          />
          <AvatarFallback>
            <span className="text-muted-foreground text-sm uppercase">
              {organization.name.charAt(0)}
            </span>
          </AvatarFallback>
        </Avatar>
        <span className="truncate">{organization.name}</span>
      </div>
    ),
    value: organization.id,
  })) ?? [
    {
      label: (
        <div className="flex min-w-0 items-center gap-2">
          <Avatar size="sm">
            <AvatarFallback>
              <Icons.Building className="size-3.5" />
            </AvatarFallback>
          </Avatar>
          <span className="truncate">{t("organization")}</span>
        </div>
      ),
      value: BillingReference.ORGANIZATION,
    },
  ];

  const personalAccount = {
    value: session.data?.user.id ?? BillingReference.USER,
    label: (
      <div className="flex min-w-0 items-center gap-2">
        <Avatar size="sm">
          <AvatarImage
            src={session.data?.user.image ?? undefined}
            alt={session.data?.user.name ?? ""}
          />
          <AvatarFallback>
            <Icons.UserRound className="size-3.5" />
          </AvatarFallback>
        </Avatar>

        <span className="truncate">{t("auth:account.personal")}</span>
      </div>
    ),
  };

  return (
    <div className="flex flex-col items-start gap-2">
      <Label htmlFor="reference-selector">{t("onBehalfOf")}</Label>
      <Select
        id="reference-selector"
        items={[personalAccount, ...(organizationsItems ?? [])]}
        value={controls.referenceId ?? controls.referenceType}
        onValueChange={(value) => {
          if (!value) return;

          if (Object.values(BillingReference).includes(value)) {
            setControls({
              referenceId: null,
              referenceType: value as BillingReference,
            });
          } else {
            setControls({
              referenceId: value,
              referenceType:
                session.data?.user.id === value
                  ? BillingReference.USER
                  : BillingReference.ORGANIZATION,
            });
          }
        }}
      >
        <SelectTrigger className="w-50">
          <SelectValue placeholder={t("onBehalfOf")} />
        </SelectTrigger>
        <SelectContent className="w-50" align="start">
          <SelectItem
            key={personalAccount.value}
            value={personalAccount.value}
            className="*:min-w-0"
          >
            {personalAccount.label}
          </SelectItem>
          {organizationsItems && organizationsItems.length > 0 && (
            <>
              <SelectSeparator />
              {organizationsItems.map((item) => (
                <SelectItem
                  key={item.value}
                  value={item.value}
                  className="*:min-w-0"
                >
                  {item.label}
                </SelectItem>
              ))}
            </>
          )}
        </SelectContent>
      </Select>
    </div>
  );
};
