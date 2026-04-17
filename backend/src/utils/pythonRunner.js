import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
import { fileURLToPath } from "node:url";

const execFileAsync = promisify(execFile);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..", "..");
const sharedRoot = path.resolve(projectRoot, "..", "shared");

function getPythonCandidates() {
  const configured = String(process.env.PYTHON_COMMAND || "").trim();
  if (configured) {
    return [configured];
  }

  if (process.platform === "win32") {
    return ["py", "python", "python3"];
  }

  return ["python3", "python"];
}

export async function runMlScript(scriptRelativePath, args) {
  const scriptPath = path.resolve(sharedRoot, scriptRelativePath);
  let lastError;

  for (const pythonCommand of getPythonCandidates()) {
    try {
      const { stdout, stderr } = await execFileAsync(pythonCommand, [scriptPath, ...args], {
        cwd: sharedRoot,
        windowsHide: true,
      });

      if (stderr && stderr.trim()) {
        console.warn(stderr);
      }

      return stdout.trim();
    } catch (error) {
      if (error?.code !== "ENOENT") {
        throw error;
      }
      lastError = error;
    }
  }

  if (lastError) {
    throw new Error(`Python runtime not found. Tried: ${getPythonCandidates().join(", ")}`);
  }

  throw new Error("Python runtime not found");
}
