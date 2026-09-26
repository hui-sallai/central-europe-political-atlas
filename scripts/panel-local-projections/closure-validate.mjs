import path from "node:path";
import { fileURLToPath } from "node:url";
import { validatePanelClosure } from "./closure-validation.mjs";
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const failures=validatePanelClosure({root,preExport:process.argv.includes("--pre-export")});
if(failures.length){for(const failure of failures)console.error(`FAIL: ${failure}`);process.exitCode=1;}
else console.log(`Panel LP closure validation PASS (${process.argv.includes("--pre-export")?"canonical source":"canonical source and public export"}).`);
