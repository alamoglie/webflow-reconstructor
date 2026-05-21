/**
 * Module-level in-memory store for generated guides.
 *
 * Lives in the Next.js server process — accessible from all API routes
 * via HTTP, which bypasses the browser's third-party Storage Partitioning
 * that blocks localStorage sharing between a browser tab and an iframe
 * embedded on a different top-level site (e.g. app.webflow.com).
 */

import type { GuideHistoryEntry } from '@/lib/guide-history';

const MAX_ENTRIES = 30;

// eslint-disable-next-line prefer-const
let guides: GuideHistoryEntry[] = [];

export function getGuides(): GuideHistoryEntry[] {
  return [...guides];
}

export function addGuide(entry: GuideHistoryEntry): void {
  // Deduplicate by id (e.g. double-save on hot reload)
  guides = [entry, ...guides.filter((g) => g.id !== entry.id)].slice(
    0,
    MAX_ENTRIES
  );
}

export function removeGuide(id: string): void {
  guides = guides.filter((g) => g.id !== id);
}
