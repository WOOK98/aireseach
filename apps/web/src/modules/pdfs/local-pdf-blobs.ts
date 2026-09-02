/**
 * IndexedDB-backed blob storage for local PDF files (#197).
 *
 * When the API is unavailable, the actual PDF bytes are stored in
 * IndexedDB so the reader can render them via object URLs.
 *
 * REDLINES:
 * - No file paths, secrets, or internal identifiers in user-visible text.
 * - Object URLs are revoked when no longer needed.
 */

const DB_NAME = "airesearch_local_pdfs";
const DB_VERSION = 1;
const STORE_NAME = "blobs";

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") {
      reject(new Error("IndexedDB unavailable"));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.addEventListener("upgradeneeded", () => {
      req.result.createObjectStore(STORE_NAME);
    });
    req.addEventListener("success", () => resolve(req.result));
    req.addEventListener("error", () => reject(req.error));
  });
}

/** Store a PDF file blob keyed by its local PDF id. */
export async function storePdfBlob(
  id: string,
  file: File | Blob,
): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(file, id);
    tx.addEventListener("complete", () => resolve());
    tx.addEventListener("error", () => reject(tx.error));
  });
}

/** Retrieve a PDF file blob by local PDF id. Returns null if not found. */
export async function getPdfBlob(id: string): Promise<Blob | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const req = tx.objectStore(STORE_NAME).get(id);
    req.addEventListener("success", () => resolve(req.result ?? null));
    req.addEventListener("error", () => reject(req.error));
  });
}

/** Delete a PDF file blob by local PDF id. */
export async function deletePdfBlob(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).delete(id);
    tx.addEventListener("complete", () => resolve());
    tx.addEventListener("error", () => reject(tx.error));
  });
}

/**
 * Create an object URL for a local PDF blob.
 * The caller MUST revoke the URL when done (URL.revokeObjectURL).
 * Returns null if the blob is not found.
 */
export async function createLocalPdfObjectUrl(
  id: string,
): Promise<string | null> {
  const blob = await getPdfBlob(id);
  if (!blob) return null;
  return URL.createObjectURL(blob);
}
