import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
import { fileURLToPath } from "node:url";

const execFileAsync = promisify(execFile);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..", "..");
const sharedRoot = path.resolve(projectRoot, "..", "shared");
const pythonCommand = process.env.PYTHON_COMMAND || "py";

export async function runMlScript(scriptRelativePath, args) {
  const scriptPath = path.resolve(sharedRoot, scriptRelativePath);
  const { stdout, stderr } = await execFileAsync(pythonCommand, [scriptPath, ...args], {
    cwd: sharedRoot,
    windowsHide: true,
  });

  if (stderr && stderr.trim()) {
    console.warn(stderr);
  }

  return stdout.trim();
}
