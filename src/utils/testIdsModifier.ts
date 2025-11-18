import fs from "fs";
import { toSnakeCase, toKebabCase } from "./idGenerator";
import * as vscode from "vscode";

export async function parseAndModifyTestIds(
  testIdsPath: string,
  feature: string,
  fileName: string,
  reactFilePath: string
) {
  const content = fs.readFileSync(testIdsPath, "utf-8");

  const fileKey = toSnakeCase(fileName);
  const fileKeyKebab = toKebabCase(fileKey);

  // Components we will scan for in React file
  const allowed = [
    "Button",
    "TextInput",
    "Dropdown",
    "Checkbox",
    "Label",
    "Icon",
  ];
  const reactContent = fs.readFileSync(reactFilePath, "utf-8");

  const componentMap: Record<string, string> = {};
  const counts: Record<string, number> = {};

  allowed.forEach((c) => {
    const regex = new RegExp(`<${c}\\b`, "g");
    const matches = [...reactContent.matchAll(regex)];

    matches.forEach(() => {
      const key = c.toLowerCase();

      if (!counts[key]) counts[key] = 0;
      const count = counts[key]++;

      const id =
        count === 0
          ? `${fileKeyKebab}-${key}`
          : `${fileKeyKebab}-${key}-${count}`;

      const propKey = count === 0 ? key : `${key}_${count}`;

      componentMap[propKey] = id;
    });
  });

  // Insert into TEST_IDS object
  let newBlock = `${feature}: {\n    ${fileKey}: {\n`;

  for (const [k, v] of Object.entries(componentMap)) {
    newBlock += `      ${k}: "${v}",\n`;
  }

  newBlock += `    }\n  },`;

  const updated = content.replace(
    /export const TEST_IDS = {/,
    `export const TEST_IDS = {\n  ${newBlock}`
  );

  fs.writeFileSync(testIdsPath, updated, "utf-8");

  return { fileKey, componentMap };
}
