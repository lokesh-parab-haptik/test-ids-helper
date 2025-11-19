import fs from "fs";
import * as babelParser from "@babel/parser";
import traverse from "@babel/traverse";
import generate from "@babel/generator";
import * as t from "@babel/types";
import { toSnakeCase, toKebabCase } from "./idGenerator";

/**
 * Safely parse testIds.js, insert/update TEST_IDS[FEATURE][fileKey] object with componentMap
 *
 * Returns { fileKey, componentMap } where componentMap maps propKey -> idValue
 *
 * - feature MUST be in CAPS (caller validated)
 * - fileName is original filename (e.g. CreateCampaignPage.jsx)
 */
export async function parseAndModifyTestIds(
  testIdsPath: string,
  feature: string,
  fileName: string,
  reactFilePath: string
) {
  const code = fs.readFileSync(testIdsPath, "utf-8");
  const ast = babelParser.parse(code, {
    sourceType: "module",
    plugins: ["jsx", "typescript"],
  });

  const fileKey = toSnakeCase(fileName); // lowercase_snake
  const fileKeyKebab = toKebabCase(fileKey); // kebab

  // components to look at will be passed in reactModifier; here we only add the provided componentMap
  // But we need to compute componentMap by scanning react file (caller passed react file path) - earlier design scanned inside this fn
  // We'll scan react file here for allowed components:
  const reactContent = fs.readFileSync(reactFilePath, "utf-8");
  const allowed = [
    "Button",
    "TextInput",
    "Dropdown",
    "Checkbox",
    "Label",
    "Icon",
  ];

  const counts: Record<string, number> = {};
  const componentMap: Record<string, string> = {};

  allowed.forEach((Comp) => {
    const regex = new RegExp(`<${Comp}\\b`, "g");
    const matches = [...reactContent.matchAll(regex)];
    matches.forEach(() => {
      const key = Comp.toLowerCase();
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

  // Find export const TEST_IDS = { ... }
  let modified = false;
  traverse(ast as any, {
    VariableDeclarator(pathVar) {
      const id = pathVar.node.id;
      if (!t.isIdentifier(id) || id.name !== "TEST_IDS") return;
      // Ensure it's exported
      const parent = pathVar.parentPath.parent;
      // pathVar.node.init should be an ObjectExpression
      const init = pathVar.node.init;
      if (!t.isObjectExpression(init)) return;

      // find or add FEATURE property in TEST_IDS
      const featureProp = init.properties.find(
        (p) =>
          t.isObjectProperty(p) &&
          t.isIdentifier((p as t.ObjectProperty).key) &&
          ((p as t.ObjectProperty).key as t.Identifier).name === feature
      ) as t.ObjectProperty | undefined;

      // ensure feature exists
      let featureObjExpr: t.ObjectExpression;
      if (
        featureProp &&
        t.isObjectProperty(featureProp) &&
        t.isObjectExpression(featureProp.value)
      ) {
        featureObjExpr = featureProp.value;
      } else {
        // create the feature property
        featureObjExpr = t.objectExpression([]);
        const newFeatureProp = t.objectProperty(
          t.identifier(feature),
          featureObjExpr
        );
        init.properties.unshift(newFeatureProp);
      }

      // inside featureObjExpr, add fileKey object
      const existingFileProp = featureObjExpr.properties.find(
        (p) =>
          t.isObjectProperty(p) &&
          ((p as t.ObjectProperty).key as t.Identifier).name === fileKey
      ) as t.ObjectProperty | undefined;

      let fileObjExpr: t.ObjectExpression;
      if (
        existingFileProp &&
        t.isObjectProperty(existingFileProp) &&
        t.isObjectExpression(existingFileProp.value)
      ) {
        fileObjExpr = existingFileProp.value;
      } else {
        fileObjExpr = t.objectExpression([]);
        const newFileProp = t.objectProperty(
          t.identifier(fileKey),
          fileObjExpr
        );
        featureObjExpr.properties.push(newFileProp);
      }

      // Add keys inside fileObjExpr, but do not overwrite keys that exist already
      const existingKeys = new Set(
        fileObjExpr.properties
          .filter(
            (p) =>
              t.isObjectProperty(p) &&
              t.isIdentifier((p as t.ObjectProperty).key)
          )
          .map((p) => ((p as t.ObjectProperty).key as t.Identifier).name)
      );

      for (const [propKey, idValue] of Object.entries(componentMap)) {
        if (existingKeys.has(propKey)) continue; // do not overwrite
        const prop = t.objectProperty(
          t.identifier(propKey),
          t.stringLiteral(idValue)
        );
        fileObjExpr.properties.push(prop);
      }

      modified = true;
      pathVar.stop();
    },
  });

  if (!modified) {
    // fallback: if TEST_IDS not found, append a new export at the end
    const testIdsAst = babelParser.parse(
      `export const TEST_IDS = { ${feature}: { ${fileKey}: { ${Object.entries(
        componentMap
      )
        .map(([k, v]) => `${k}: "${v}"`)
        .join(", ")} } } };`,
      { sourceType: "module", plugins: ["jsx", "typescript"] }
    );
    // append nodes to ast.program.body
    ast.program.body.push(...testIdsAst.program.body);
  }

  const out = generate(
    ast,
    {
      /* options */
    },
    code
  ).code;
  fs.writeFileSync(testIdsPath, out, "utf-8");

  return { fileKey, componentMap };
}
