import { NotesSection } from "~/modules/workspace/sections/notes-section";

/**
 * `/workspace/notes` — notes object list inside the workspace shell (#197).
 * Rows deep-link into the canvas via `?object=note:<id>`.
 */
export default function WorkspaceNotesPage() {
  return <NotesSection />;
}
