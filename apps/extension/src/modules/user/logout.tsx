import { useMutation } from "@tanstack/react-query";

import { useTranslation } from "@workspace/i18n";
import { cn } from "@workspace/ui";
import { Icons } from "@workspace/ui-web/icons";

import { authClient } from "~/lib/auth";

export const Logout = ({
  className,
  ...props
}: React.ComponentProps<"button">) => {
  const { t } = useTranslation("auth");

  const signOut = useMutation({
    mutationKey: ["auth", "signOut"],
    mutationFn: () => authClient.signOut(),
  });

  return (
    <button
      className={cn(
        "flex w-full cursor-pointer items-center gap-1.5 text-left",
        className,
      )}
      onClick={() => signOut.mutate()}
      {...props}
    >
      <Icons.LogOut className="size-4" />
      {t("logout.cta")}
    </button>
  );
};
