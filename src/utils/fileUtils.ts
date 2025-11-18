import fs from "fs";
import path from "path";

export function findFile(root: string, fileName: string): string | null {
  const items = fs.readdirSync(root);

  for (let item of items) {
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

export function detectUseTestIdsImport(
  root: string,
  reactFile: string
): string {
  const hookPath = findFile(root, "useTestIds.js");
  if (!hookPath) return "./useTestIds";

  return path.relative(path.dirname(reactFile), hookPath).replace(/\\/g, "/");
}
