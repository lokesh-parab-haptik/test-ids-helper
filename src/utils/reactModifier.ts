import fs from "fs";
import * as vscode from "vscode";

export async function modifyReactFile(
  filePath: string,
  feature: string,
  fileKey: string,
  componentMap: Record<string, string>,
  importPath: string
) {
  let text = fs.readFileSync(filePath, "utf-8");

  // 1. Add import if missing
  if (!text.includes("useTestIds")) {
    text = `import { useTestIds } from "${importPath}";\n` + text;
  }

  // 2. Add hook
  if (!text.includes("const testIds = useTestIds()")) {
    text = text.replace(
      /(import[\s\S]+?;)/,
      `$1\n\nconst testIds = useTestIds();\n`
    );
  }

  // 3. Add data-testid props
  for (const key of Object.keys(componentMap)) {
    const id = componentMap[key];
    const regex = new RegExp(`<([A-Za-z]+)([^>]*)>`, "g");

    text = text.replace(regex, (match, comp, props) => {
      if (!props.includes("data-testid") && match.includes(comp)) {
        return `<${comp} data-testid={testIds.${feature}.${fileKey}.${key}}${props}>`;
      }
      return match;
    });
  }

  fs.writeFileSync(filePath, text, "utf-8");
}
