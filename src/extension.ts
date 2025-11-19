import * as vscode from "vscode";
import path from "path";
import { detectTestIdsImport, findFile } from "./utils/fileUtils";
import { parseAndModifyTestIds } from "./utils/testIdsModifier";
import { modifyReactFile } from "./utils/reactModifier";

export function activate(context: vscode.ExtensionContext) {
  const disposable = vscode.commands.registerCommand(
    "test-id-generator.generate",
    async () => {
      const workspace = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
      if (!workspace) {
        vscode.window.showErrorMessage("Open a workspace first!");
        return;
      }

      // 1. Ask file - show progress
      const fileName = await vscode.window.showInputBox({
        placeHolder: "Enter the filename (e.g., CreateCampaignPage.jsx)",
      });
      if (!fileName) return;

      // show progress notification while searching
      const fullPath = await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: `Searching for ${fileName}…`,
          cancellable: false,
        },
        async () => {
          const found = findFile(workspace, fileName);
          return found;
        }
      );

      if (!fullPath) {
        vscode.window.showErrorMessage(
          `File "${fileName}" not found in workspace.`
        );
        return;
      }

      // 2. Ask feature name
      let feature = await vscode.window.showInputBox({
        placeHolder: "Enter FEATURE name (e.g., SIDEBAR) - must be CAPS",
      });

      if (!feature) return;

      if (feature !== feature.toUpperCase()) {
        const fix = await vscode.window.showWarningMessage(
          "FEATURE must be in CAPS. Convert to CAPS?",
          "Yes",
          "No"
        );
        if (fix === "Yes") feature = feature.toUpperCase();
        else return;
      }

      // 3. find testIds.js
      const testIdsPath = findFile(workspace, "testIds.js");
      if (!testIdsPath) {
        const create = await vscode.window.showWarningMessage(
          "testIds.js not found. Create a new testIds.js in workspace root?",
          "Yes",
          "No"
        );
        if (create !== "Yes") return;
        // create a minimal TEST_IDS file
        const template = `export const TEST_IDS = {};`;
        // put in workspace root
        const target = path.join(workspace, "testIds.js");
        require("fs").writeFileSync(target, template, "utf-8");
      }

      // re-resolve path after potential creation
      const resolvedTestIdsPath = findFile(workspace, "testIds.js")!;
      if (!resolvedTestIdsPath) {
        vscode.window.showErrorMessage("Could not create or find testIds.js");
        return;
      }

      // 4. update testIds and get componentMap
      const data = await parseAndModifyTestIds(
        resolvedTestIdsPath,
        feature,
        fileName,
        fullPath
      );

      // 5. detect import path to testIds
      const importPath = detectTestIdsImport(workspace, fullPath);

      // 6. modify the react file
      await modifyReactFile(
        fullPath,
        feature,
        data.fileKey,
        data.componentMap,
        importPath
      );

      vscode.window.showInformationMessage(
        "Test IDs generated/updated successfully."
      );
    }
  );

  context.subscriptions.push(disposable);
}

export function deactivate() {}
