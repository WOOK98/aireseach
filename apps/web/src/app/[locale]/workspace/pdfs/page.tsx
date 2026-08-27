import { redirect } from "next/navigation";

import { pathsConfig } from "~/config/paths";

export default function WorkspacePdfsPage() {
  redirect(pathsConfig.dashboard.user.pdfs);
}
