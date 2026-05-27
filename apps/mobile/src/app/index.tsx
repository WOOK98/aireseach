import { Redirect } from "expo-router";

import { useSetupSteps } from "~/app/(setup)/steps/_layout";
import { pathsConfig } from "~/config/paths";
import { authClient } from "~/lib/auth";
import { Spinner } from "~/modules/common/spinner";

export default function Index() {
  const { data, isPending } = authClient.useSession();
  const { step } = useSetupSteps();

  if (isPending) {
    return <Spinner modal={false} />;
  }

  if (!data) {
    return <Redirect href={pathsConfig.setup.welcome} />;
  }

  if (step) {
    return <Redirect href={step} />;
  }

  if (data.session.activeOrganizationId) {
    return <Redirect href={pathsConfig.dashboard.organization.index} />;
  }

  return <Redirect href={pathsConfig.dashboard.user.index} />;
}
