import fs from "fs";
import path from "path";

/**
 * Recursively finds a file by name (case-insensitive) under `root`.
 * Returns full path or null.
 */
export function findFile(root: string, fileName: string): string | null {
  const items = fs.readdirSync(root);

  for (const item of items) {
    const full = path.join(root, item);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      const found = findFile(full, fileName);
      if (found) return found;
    } else {
      if (item.toLowerCase() === fileName.toLowerCase()) return full;
    }
  }
  return null;
}

/**
 * Find path to testIds.js relative to the reactFile path.
 * Returns a relative import path like ../../automationHooks/testIds
 */
export function detectTestIdsImport(root: string, reactFile: string): string {
  const testIdsPath = findFile(root, "testIds.js");
  if (!testIdsPath) {
    // default fallback
    return "./testIds";
  }
  // compute relative path without extension
  let rel = path
    .relative(path.dirname(reactFile), testIdsPath)
    .replace(/\\/g, "/");
  // remove .js extension for import
  rel = rel.replace(/\.js$/, "");
  if (!rel.startsWith(".")) rel = "./" + rel;
  return rel;
}
