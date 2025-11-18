import * as vscode from "vscode";
import path from "path";
import { detectUseTestIdsImport, findFile } from "./utils/fileUtils";
import { parseAndModifyTestIds } from "./utils/testIdsModifier";
import { modifyReactFile } from "./utils/reactModifier";

export function activate(context: vscode.ExtensionContext) {
  let disposable = vscode.commands.registerCommand(
    "test-id-generator.generate",
    async () => {
      const workspace = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
      if (!workspace) {
        vscode.window.showErrorMessage("Open a workspace first!");
        return;
      }

      // 1. Ask file
      const fileName = await vscode.window.showInputBox({
        placeHolder: "Enter the filename (e.g., CreateCampaignPage.jsx)",
      });

      if (!fileName) return;

      const fullPath = findFile(workspace, fileName);
      if (!fullPath) {
        vscode.window.showErrorMessage("File not found in workspace.");
        return;
      }

      // 2. Ask feature name
      let feature = await vscode.window.showInputBox({
        placeHolder: "Enter FEATURE name (e.g., SIDEBAR)",
      });

      if (!feature) return;

      if (feature !== feature.toUpperCase()) {
        vscode.window.showErrorMessage("FEATURE must be in CAPS.");
        return;
      }

      // 3. Modify testIds.js
      const testIdsPath = findFile(workspace, "testIds.js");

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

      // 4. Modify React file
      const importPath = detectUseTestIdsImport(workspace, fullPath);

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

export function deactivate() {}
