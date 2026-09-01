import { PdfsPage } from "~/modules/pdfs/pdfs-page";

/**
 * `/workspace/pdfs` — PDF library inside the workspace shell (#197).
 * Rows open the PDF object panel in the canvas; the reader stays at
 * `/dashboard/pdfs/[id]`.
 */
export default function WorkspacePdfsPage() {
  return <PdfsPage />;
}
