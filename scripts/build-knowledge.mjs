import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = path.join(ROOT_DIR, "knowledge-base.txt");
const target = path.join(ROOT_DIR, "api", "_lib", "knowledge.js");

const text = fs.readFileSync(source, "utf8");
const banner = "// Generated from knowledge-base.txt by scripts/build-knowledge.mjs — do not edit by hand.\n";

fs.mkdirSync(path.dirname(target), { recursive: true });
fs.writeFileSync(target, `${banner}export const KNOWLEDGE_BASE = ${JSON.stringify(text)};\n`);
console.log(`Wrote ${target} (${text.length} chars)`);
