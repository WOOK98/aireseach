import { redirect } from "next/navigation";

import { pathsConfig } from "~/config/paths";

export default function UserPage() {
  redirect(pathsConfig.dashboard.user.report);
}
