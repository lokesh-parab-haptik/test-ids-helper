import fs from "fs";
import * as vscode from "vscode";

/**
 * Add TEST_IDS import (if missing) and inject data-testid attributes into allowed components.
 *
 * componentMap: propKey -> idValue
 * importPath: relative import path WITHOUT extension
 */
export async function modifyReactFile(
  filePath: string,
  feature: string,
  fileKey: string,
  componentMap: Record<string, string>,
  importPath: string
) {
  let text = fs.readFileSync(filePath, "utf-8");

  // ---------------------------------------------------------
  // 1) Ensure TEST_IDS import exists
  // ---------------------------------------------------------
  const importStatement = `import { TEST_IDS } from "${importPath}";`;

  if (!/import\s+\{\s*TEST_IDS\s*\}\s+from\s+['"]/.test(text)) {
    const lastImportMatch = [...text.matchAll(/^import .*;$/gm)].pop();
    if (lastImportMatch) {
      const insertPos = lastImportMatch.index! + lastImportMatch[0].length;
      text =
        text.slice(0, insertPos) +
        "\n" +
        importStatement +
        text.slice(insertPos);
    } else {
      text = importStatement + "\n\n" + text;
    }
  }

  // ---------------------------------------------------------
  // 2) For each allowed component, inject data-testid
  // ---------------------------------------------------------
  const allowed = [
    "Button",
    "TextInput",
    "Dropdown",
    "Checkbox",
    "Label",
    "Icon",
    "Tooltip",
  ];

  for (const comp of allowed) {
    // Match both self-closing and normal tags across multiple lines:
    //
    // <Icon ... />
    // <Icon
    //    prop="v"
    // >
    //
    const tagRegex = new RegExp(`<${comp}(\\s[\\s\\S]*?)?>`, "g");

    let match;
    let occIndex = 0;

    while ((match = tagRegex.exec(text)) !== null) {
      const fullMatch = match[0];
      const propsStr = match[1] || "";

      // Skip if already contains data-testid
      if (/data-testid\s*=/.test(propsStr)) {
        occIndex++;
        continue;
      }

      // Compute propKey for this component instance
      const compKey = comp.toLowerCase();
      const possibleKeys = Object.keys(componentMap).filter((k) =>
        k.startsWith(compKey)
      );

      let chosenKey =
        possibleKeys[occIndex] ?? possibleKeys[possibleKeys.length - 1];

      // If more occurrences than mapped, create a new unique key
      if (occIndex >= possibleKeys.length) {
        const newIndex = possibleKeys.length;
        chosenKey = `${compKey}_${newIndex}`;
        componentMap[chosenKey] = `${fileKey.replace(
          /_/g,
          "-"
        )}-${compKey}-${newIndex}`;
      }

      const idExpr = `TEST_IDS.${feature}.${fileKey}.${chosenKey}`;

      const before = text.slice(0, match.index);
      const after = text.slice(match.index + fullMatch.length);

      let newTag = fullMatch.trimEnd();

      // ---------------------------------------------------------
      // HANDLE SELF-CLOSING TAG <Comp ... />
      // ---------------------------------------------------------
      if (/\/>$/.test(newTag)) {
        newTag = newTag.replace(/\/>$/, ` data-testid={${idExpr}} />`);
      }
      // ---------------------------------------------------------
      // HANDLE NORMAL OPEN TAG <Comp ... >
      // ---------------------------------------------------------
      else {
        newTag = newTag.replace(/>$/, ` data-testid={${idExpr}}>`);
      }

      // Patch final content
      text = before + newTag + after;

      // Move regex pointer forward
      tagRegex.lastIndex = match.index + newTag.length;
      occIndex++;
    }
  }

  // ---------------------------------------------------------
  // 3) Write final updated file
  // ---------------------------------------------------------
  fs.writeFileSync(filePath, text, "utf-8");
}
