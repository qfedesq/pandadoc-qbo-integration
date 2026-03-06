import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

execFileSync("npm", ["version", "minor", "--no-git-tag-version"], {
  stdio: "inherit",
});

const packageJson = JSON.parse(
  readFileSync(new URL("../package.json", import.meta.url), "utf8"),
);
const [major = "0", minor = "0"] = packageJson.version.split(".");

console.log(`semver=${packageJson.version}`);
console.log(`display=V${major}.${minor}`);
