/**
 * Module-level singleton for cross-page file handoff.
 * Works because Next.js App Router client components share the same browser JS module graph.
 */

export interface StoredDoc {
  id: string;
  name: string;
  size: number;
  ext: string;
  source: string;
  docType: string;
  uploadedAt: string;
}

let _file: File | null = null;
let _queue: StoredDoc[] = [];

export const uploadStore = {
  setFile(f: File | null) { _file = f; },
  getFile(): File | null { return _file; },
  push(doc: StoredDoc) { _queue.push(doc); },
  drain(): StoredDoc[] { const d = [..._queue]; _queue = []; return d; },
};
