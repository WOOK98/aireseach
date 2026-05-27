import { useMutation, useMutationState } from "@tanstack/react-query";
import { createContext, useContext, useMemo, useState } from "react";
import { FormProvider, useForm, useFormContext } from "react-hook-form";
import { Alert, Text, View } from "react-native";
import * as z from "zod";

import { handle } from "@workspace/api/utils";
import { useTranslation } from "@workspace/i18n";
import { cn } from "@workspace/ui";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui-mobile/avatar";
import { Button } from "@workspace/ui-mobile/button";
import { Icons } from "@workspace/ui-mobile/icons";
import { Spin } from "@workspace/ui-mobile/spin";

import { api } from "~/lib/api";
import { useImagePicker } from "~/modules/common/hooks/use-image-picker";

import type { ImagePickerAsset } from "expo-image-picker";

interface AvatarFormProps {
  readonly id: string;
  readonly image?: string | null;
  readonly update: (image: string | null) => Promise<unknown>;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
]);

const mutations = {
  upload: {
    mutationKey: ["avatar", "upload"] as const,
    mutationFn: async ({
      avatar,
      id,
      image,
      update,
    }: AvatarFormProps & { avatar?: ImagePickerAsset }) => {
      if (!avatar) throw new Error("No file selected");

      const guessedExtensionFromMime = avatar.mimeType?.split("/").pop();
      const guessedExtensionFromUri = avatar.uri.split(".").pop();
      const extension =
        guessedExtensionFromMime ?? guessedExtensionFromUri ?? "jpg";
      const uuid = String(Date.now());
      const path = `avatars/${id}-${uuid}.${extension}`;

      const blob = await fetch(avatar.uri).then((r) => r.blob());

      const { url: uploadUrl } = await handle(api.storage.upload.$get)({
        query: { path },
      });

      const response = await fetch(uploadUrl, {
        method: "PUT",
        body: blob,
        headers: {
          "Content-Type": avatar.mimeType ?? "",
        },
      });

      if (!response.ok) {
        throw new Error();
      }

      const { url: publicUrl } = await handle(api.storage.public.$get)({
        query: { path },
      });

      await update(publicUrl);

      return { publicUrl, oldImage: image };
    },
  },
  remove: {
    mutationKey: ["avatar", "remove"] as const,
    mutationFn: async ({ image, update }: Omit<AvatarFormProps, "id">) => {
      const path = image?.split("/").pop();
      if (!path) return;

      const { url: deleteUrl } = await handle(api.storage.delete.$get)({
        query: { path: `avatars/${path}` },
      });

      await update(null);

      void fetch(deleteUrl, { method: "DELETE" });
    },
  },
} as const;

const useAvatarFormSchema = () => {
  const assetSchema = z.object({
    uri: z.string().min(1),
    mimeType: z.string().optional(),
    fileSize: z.number().optional(),
    width: z.number().optional(),
    height: z.number().optional(),
  });

  return z.object({
    avatar: assetSchema
      .refine((file) => (file.fileSize ?? MAX_FILE_SIZE) <= MAX_FILE_SIZE, {
        message: "error.tooBig.file.inclusive",
        path: ["avatar"],
      })
      .refine(
        (file) => !file.mimeType || ACCEPTED_IMAGE_TYPES.has(file.mimeType),
        {
          message: "error.file.type",
          path: ["avatar"],
        },
      ),
  });
};

interface AvatarFormContextValue extends AvatarFormProps {
  previewUrl: string | null;
  setPreviewUrl: (previewUrl: string | null) => void;
}

const AvatarFormContext = createContext<AvatarFormContextValue | null>(null);

const useAvatarFormContext = () => {
  const context = useContext(AvatarFormContext);
  if (!context) {
    throw new Error("useAvatarFormContext must be used within a AvatarForm!");
  }
  return context;
};

const AvatarForm = ({
  id,
  image,
  update,
  children,
}: AvatarFormProps & { children: React.ReactNode }) => {
  const [previewUrl, setPreviewUrl] = useState(image ?? null);
  const _avatarSchema = useAvatarFormSchema();
  const form = useForm<z.infer<typeof _avatarSchema>>();

  const value = useMemo(
    () => ({ id, image, update, previewUrl, setPreviewUrl }),
    [id, image, update, previewUrl, setPreviewUrl],
  );

  return (
    <AvatarFormContext.Provider value={value}>
      <FormProvider {...form}>{children}</FormProvider>
    </AvatarFormContext.Provider>
  );
};

const AvatarFormUploadButton = ({
  className,
  onUpload,
  disabled,
  ...props
}: React.ComponentProps<typeof Button> & { onUpload?: () => void }) => {
  const { t } = useTranslation(["common", "validation"]);
  const { pick } = useImagePicker();
  const { image, setPreviewUrl, id, update } = useAvatarFormContext();
  const avatarSchema = useAvatarFormSchema();

  const { setError, clearErrors } =
    useFormContext<z.infer<typeof avatarSchema>>();

  const upload = useMutation({
    ...mutations.upload,
    onError: (error) => {
      setPreviewUrl(image ?? null);
      Alert.alert(
        t("common:error.title"),
        error.message || t("common:error.general"),
      );
    },
    onSuccess: async ({ publicUrl, oldImage }) => {
      clearErrors();
      setPreviewUrl(publicUrl);

      if (oldImage) {
        const oldPath = oldImage.split("/").pop();
        if (oldPath) {
          const { url: deleteUrl } = await handle(api.storage.delete.$get)({
            query: { path: `avatars/${oldPath}` },
          });
          void fetch(deleteUrl, { method: "DELETE" });
        }
      }

      onUpload?.();
    },
  });

  const [removeStatus] = useMutationState({
    filters: { mutationKey: mutations.remove.mutationKey },
    select: (mutation) => mutation.state.status,
  });

  const handlePick = async () => {
    const asset = await pick();
    if (!asset) {
      return;
    }

    const result = avatarSchema.safeParse({ avatar: asset });
    if (!result.success) {
      const firstIssue = result.error.issues[0];
      const firstMsg = firstIssue?.message ?? "";
      setError("avatar", { message: firstMsg });
      Alert.alert(t("common:error.title"), firstMsg);
      return;
    }

    setPreviewUrl(asset.uri);
    upload.mutate({
      avatar: asset,
      id,
      image,
      update,
    });
  };

  return (
    <Button
      hitSlop={4}
      variant="outline"
      size="icon"
      className={cn(
        "dark:bg-background active:bg-muted absolute -right-2 -bottom-2.5 rounded-full",
        className,
      )}
      onPress={handlePick}
      disabled={disabled ?? (upload.isPending || removeStatus === "pending")}
      {...props}
    >
      <Icons.Pencil size={14} className="text-foreground" />
    </Button>
  );
};

const AvatarFormPreview = ({
  className,
  fallback,
  ...props
}: React.ComponentProps<typeof Avatar> & { fallback?: React.ReactNode }) => {
  const { previewUrl } = useAvatarFormContext();
  const _avatarSchema = useAvatarFormSchema();
  const { formState } = useFormContext<z.infer<typeof _avatarSchema>>();

  const mutationStatuses = useMutationState({
    filters: {
      predicate: (mutation) =>
        mutation.options.mutationKey === mutations.upload.mutationKey ||
        mutation.options.mutationKey === mutations.remove.mutationKey,
    },
    select: (mutation) => mutation.state.status,
  });

  const hasError =
    Boolean(formState.errors.avatar) ||
    mutationStatuses.some((s) => s === "error");

  return (
    <View className="relative">
      <Avatar
        className={cn(
          "size-26",
          hasError ? "ring-destructive ring-2 ring-offset-2" : "",
          className,
        )}
        {...props}
      >
        {previewUrl && <AvatarImage source={{ uri: previewUrl }} />}
        {mutationStatuses.some((status) => status === "pending") && (
          <>
            <View className="bg-background absolute inset-0 rounded-full opacity-50" />
            <View className="absolute inset-0 items-center justify-center rounded-full">
              <Spin>
                <Icons.Loader2 className="text-muted-foreground" size={28} />
              </Spin>
            </View>
          </>
        )}
        <AvatarFallback>
          {fallback ?? (
            <Icons.UserRound
              width={50}
              height={50}
              className="text-foreground"
            />
          )}
        </AvatarFallback>
      </Avatar>
    </View>
  );
};

const AvatarFormRemoveButton = ({
  className,
  onRemove,
  ...props
}: React.ComponentProps<typeof Button> & { onRemove?: () => void }) => {
  const { image, update, previewUrl, setPreviewUrl } = useAvatarFormContext();
  const { clearErrors } = useFormContext();

  const [uploadStatus] = useMutationState({
    filters: {
      mutationKey: mutations.upload.mutationKey,
    },
    select: (mutation) => mutation.state.status,
  });

  const remove = useMutation({
    ...mutations.remove,
    onMutate: () => {
      setPreviewUrl(null);
    },
    onSuccess: () => {
      setPreviewUrl(null);
      onRemove?.();
    },
  });

  if (!previewUrl || uploadStatus === "pending") {
    return null;
  }

  return (
    <Button
      variant="outline"
      size="icon"
      className={cn(
        "dark:bg-background active:bg-muted absolute -top-2 -right-2 rounded-full",
        className,
      )}
      disabled={remove.isPending}
      onPress={() => {
        clearErrors();
        remove.mutate({ image, update });
      }}
      {...props}
    >
      <Icons.X size={16} strokeWidth={2} className="text-foreground" />
    </Button>
  );
};

const AvatarFormErrorMessage = ({
  className,
  ...props
}: React.ComponentProps<typeof Text>) => {
  const _avatarSchema = useAvatarFormSchema();
  const { formState } = useFormContext<z.infer<typeof _avatarSchema>>();

  if (!formState.errors.avatar) {
    return null;
  }

  return (
    <Text className={cn("text-destructive text-xs", className)} {...props}>
      {formState.errors.avatar.message}
    </Text>
  );
};

export {
  AvatarForm,
  AvatarFormPreview,
  AvatarFormRemoveButton,
  AvatarFormUploadButton,
  AvatarFormErrorMessage,
};
