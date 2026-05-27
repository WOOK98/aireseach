import { useGlobalSearchParams } from "expo-router";

import { LoginFlow } from "~/modules/auth/login";

import type { Route } from "expo-router";

const LoginPage = () => {
  const { redirectTo, invitationId, email } = useGlobalSearchParams<{
    redirectTo?: Route;
    invitationId?: string;
    email?: string;
  }>();

  return (
    <LoginFlow
      redirectTo={redirectTo}
      invitationId={invitationId}
      email={email}
    />
  );
};

export default LoginPage;
