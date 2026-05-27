import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { fetch as expoFetch } from "expo/fetch";
import { useState } from "react";
import { View, FlatList, Keyboard } from "react-native";
import Markdown from "react-native-marked";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTranslation } from "@workspace/i18n";
import { logger } from "@workspace/shared/logger";
import { cn } from "@workspace/ui";
import { Button } from "@workspace/ui-mobile/button";
import { Icons } from "@workspace/ui-mobile/icons";
import { Spin } from "@workspace/ui-mobile/spin";
import { Text } from "@workspace/ui-mobile/text";
import { Textarea } from "@workspace/ui-mobile/textarea";

import { api } from "~/lib/api";
import { KeyboardAvoidingView, ScrollView } from "~/modules/common/styled";

const EXAMPLES = [
  {
    icon: Icons.Globe2,
    prompt: "ai.prompt.history",
  },
  {
    icon: Icons.GraduationCap,
    prompt: "ai.prompt.capitals",
  },
  {
    icon: Icons.Atom,
    prompt: "ai.prompt.quantum",
  },
  {
    icon: Icons.Brain,
    prompt: "ai.prompt.realWorld",
  },
] as const;

export default function AI() {
  const { t } = useTranslation("marketing");
  const [input, setInput] = useState("");
  const insets = useSafeAreaInsets();

  const { messages, error, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({
      fetch: expoFetch as unknown as typeof globalThis.fetch,
      api: api.ai.chat.$url().toString(),
    }),
    onError: (error) => logger.error(error),
  });

  if (error) {
    return (
      <View className="bg-background flex-1 px-6">
        <Text>{error.message}</Text>
      </View>
    );
  }

  const messagesToDisplay = messages.filter((message) =>
    ["assistant", "user"].includes(message.role),
  );

  const isLoading = ["submitted", "streaming"].includes(status);

  return (
    <KeyboardAvoidingView
      behavior="padding"
      style={{ paddingTop: insets.top }}
      className="bg-background relative flex-1 px-6"
    >
      <ScrollView
        keyboardDismissMode="interactive"
        keyboardShouldPersistTaps="handled"
        contentInsetAdjustmentBehavior="automatic"
        contentContainerClassName="flex pt-4 grow items-start justify-start gap-4 pb-8"
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {messagesToDisplay.map((message) => (
          <View
            key={message.id}
            className={cn("max-w-full", {
              "bg-muted max-w-4/5 self-end rounded-lg px-5 py-2.5":
                message.role === "user",
            })}
          >
            {message.parts.map((part, i) => {
              switch (part.type) {
                case "text":
                  return message.role === "assistant" ? (
                    <Markdown
                      value={part.text.trim()}
                      flatListProps={{
                        scrollEnabled: false,
                        style: {
                          flexGrow: 0,
                        },
                      }}
                      key={`${message.id}-${i}`}
                    />
                  ) : (
                    <Text key={`${message.id}-${i}`}>{part.text}</Text>
                  );
              }
            })}
          </View>
        ))}
        {isLoading && (
          <View className="mr-auto py-2.5">
            <Spin>
              <Icons.Loader className="text-muted-foreground" size={18} />
            </Spin>
          </View>
        )}
      </ScrollView>

      {!messagesToDisplay.length && (
        <FlatList
          data={EXAMPLES}
          contentContainerClassName="gap-2 mt-auto mb-3"
          bounces={false}
          renderItem={({ item }) => (
            <Button
              onPress={() => {
                Keyboard.dismiss();
                void sendMessage({ text: t(item.prompt) });
              }}
              key={item.prompt}
              variant="outline"
              className="h-auto grow flex-row justify-start gap-3 py-3 text-left"
            >
              <item.icon
                className="text-muted-foreground shrink-0"
                width={20}
                height={20}
              />
              <Text className="text-muted-foreground">{t(item.prompt)}</Text>
            </Button>
          )}
        />
      )}

      <View className="bg-background relative pb-4">
        <Textarea
          placeholder={t("ai.placeholder")}
          value={input}
          onSubmitEditing={(e) => {
            e.preventDefault();
            Keyboard.dismiss();
            void sendMessage({ text: input });
            setInput("");
          }}
          onChange={(e) => setInput(e.nativeEvent.text)}
          className="min-h-24"
        />

        <Button
          size="icon"
          className="absolute right-2 bottom-6 rounded-full"
          disabled={isLoading}
          onPress={() => {
            Keyboard.dismiss();
            void sendMessage({ text: input });
            setInput("");
          }}
          accessibilityLabel={t("ai.cta")}
        >
          <Icons.ArrowUp className="text-primary-foreground" />
        </Button>
      </View>
    </KeyboardAvoidingView>
  );
}
