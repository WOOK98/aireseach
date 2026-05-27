import { ScrollView } from "~/modules/common/styled";
import { KeyboardAvoidingView } from "~/modules/common/styled";

export const AuthLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <KeyboardAvoidingView className="bg-background flex-1" behavior="padding">
      <ScrollView
        bounces={false}
        showsVerticalScrollIndicator={false}
        contentContainerClassName="gap-5 px-6 pt-4 pb-10"
      >
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
};
