import { redirect } from "next/navigation";

import { pathsConfig } from "~/config/paths";

export default function WorkspaceWatchlistPage() {
  redirect(pathsConfig.dashboard.user.watchlist);
}
