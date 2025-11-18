"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/extension.ts
var extension_exports = {};
__export(extension_exports, {
  activate: () => activate,
  deactivate: () => deactivate
});
module.exports = __toCommonJS(extension_exports);
var vscode = __toESM(require("vscode"));

// src/utils/fileUtils.ts
var import_fs = __toESM(require("fs"));
var import_path = __toESM(require("path"));
function findFile(root, fileName) {
  const items = import_fs.default.readdirSync(root);
  for (let item of items) {
    const full = import_path.default.join(root, item);
    const stat = import_fs.default.statSync(full);
    if (stat.isDirectory()) {
      const found = findFile(full, fileName);
      if (found) return found;
    } else {
      if (item.toLowerCase() === fileName.toLowerCase()) return full;
    }
  }
  return null;
}
function detectUseTestIdsImport(root, reactFile) {
  const hookPath = findFile(root, "useTestIds.js");
  if (!hookPath) return "./useTestIds";
  return import_path.default.relative(import_path.default.dirname(reactFile), hookPath).replace(/\\/g, "/");
}

// src/utils/testIdsModifier.ts
var import_fs2 = __toESM(require("fs"));

// src/utils/idGenerator.ts
function toSnakeCase(str) {
  return str.replace(/\.jsx?$/, "").replace(/([a-z])([A-Z])/g, "$1_$2").toLowerCase();
}
function toKebabCase(str) {
  return str.replace(/_/g, "-");
}

// src/utils/testIdsModifier.ts
async function parseAndModifyTestIds(testIdsPath, feature, fileName, reactFilePath) {
  const content = import_fs2.default.readFileSync(testIdsPath, "utf-8");
  const fileKey = toSnakeCase(fileName);
  const fileKeyKebab = toKebabCase(fileKey);
  const allowed = [
    "Button",
    "TextInput",
    "Dropdown",
    "Checkbox",
    "Label",
    "Icon"
  ];
  const reactContent = import_fs2.default.readFileSync(reactFilePath, "utf-8");
  const componentMap = {};
  const counts = {};
  allowed.forEach((c) => {
    const regex = new RegExp(`<${c}\\b`, "g");
    const matches = [...reactContent.matchAll(regex)];
    matches.forEach(() => {
      const key = c.toLowerCase();
      if (!counts[key]) counts[key] = 0;
      const count = counts[key]++;
      const id = count === 0 ? `${fileKeyKebab}-${key}` : `${fileKeyKebab}-${key}-${count}`;
      const propKey = count === 0 ? key : `${key}_${count}`;
      componentMap[propKey] = id;
    });
  });
  let newBlock = `${feature}: {
    ${fileKey}: {
`;
  for (const [k, v] of Object.entries(componentMap)) {
    newBlock += `      ${k}: "${v}",
`;
  }
  newBlock += `    }
  },`;
  const updated = content.replace(
    /export const TEST_IDS = {/,
    `export const TEST_IDS = {
  ${newBlock}`
  );
  import_fs2.default.writeFileSync(testIdsPath, updated, "utf-8");
  return { fileKey, componentMap };
}

// src/utils/reactModifier.ts
var import_fs3 = __toESM(require("fs"));
async function modifyReactFile(filePath, feature, fileKey, componentMap, importPath) {
  let text = import_fs3.default.readFileSync(filePath, "utf-8");
  if (!text.includes("useTestIds")) {
    text = `import { useTestIds } from "${importPath}";
` + text;
  }
  if (!text.includes("const testIds = useTestIds()")) {
    text = text.replace(
      /(import[\s\S]+?;)/,
      `$1

const testIds = useTestIds();
`
    );
  }
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
  import_fs3.default.writeFileSync(filePath, text, "utf-8");
}

// src/extension.ts
function activate(context) {
  let disposable = vscode.commands.registerCommand(
    "test-id-generator.generate",
    async () => {
      const workspace2 = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
      if (!workspace2) {
        vscode.window.showErrorMessage("Open a workspace first!");
        return;
      }
      const fileName = await vscode.window.showInputBox({
        placeHolder: "Enter the filename (e.g., CreateCampaignPage.jsx)"
      });
      if (!fileName) return;
      const fullPath = findFile(workspace2, fileName);
      if (!fullPath) {
        vscode.window.showErrorMessage("File not found in workspace.");
        return;
      }
      let feature = await vscode.window.showInputBox({
        placeHolder: "Enter FEATURE name (e.g., SIDEBAR)"
      });
      if (!feature) return;
      if (feature !== feature.toUpperCase()) {
        vscode.window.showErrorMessage("FEATURE must be in CAPS.");
        return;
      }
      const testIdsPath = findFile(workspace2, "testIds.js");
      if (!testIdsPath) {
        vscode.window.showErrorMessage("testIds.js not found.");
        return;
      }
      const data = await parseAndModifyTestIds(
        testIdsPath,
        feature,
        fileName,
        fullPath
      );
      const importPath = detectUseTestIdsImport(workspace2, fullPath);
      await modifyReactFile(
        fullPath,
        feature,
        data.fileKey,
        data.componentMap,
        importPath
      );
      vscode.window.showInformationMessage("Test IDs generated!");
    }
  );
  context.subscriptions.push(disposable);
}
function deactivate() {
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  activate,
  deactivate
});
//# sourceMappingURL=extension.js.map
