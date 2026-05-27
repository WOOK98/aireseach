import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { create } from "zustand";

import { useTranslation } from "@workspace/i18n";

import { auth } from "~/modules/auth/lib/api";

import { useBackupCodes } from "../backup-codes/use-backup-codes";

const useUri = create<{
  uri: string;
  setUri: (uri: string) => void;
}>((set) => ({
  uri: "",
  setUri: (uri) => set({ uri }),
}));

export const useTotp = () => {
  const { t } = useTranslation(["auth"]);
  const { uri, setUri } = useUri();
  const { codes, generate } = useBackupCodes();

  const getUri = useMutation({
    ...auth.mutations.twoFactor.totp.getUri,
    onSuccess: async ({ totpURI }, data) => {
      setUri(totpURI);
      if (!codes.length) {
        await generate.mutateAsync(data);
      }
    },
  });

  const verify = useMutation({
    ...auth.mutations.twoFactor.totp.verify,
    onSuccess: (_, __) => {
      toast.success(t("account.twoFactor.totp.success"));
    },
  });

  return { uri, setUri, verify, getUri };
};
