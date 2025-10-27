import { readFileSync } from "fs";
import { join } from "path";
import { createHash } from "crypto";

/**
 * System Prompt Loader
 * 
 * Loads and concatenates shared directives + app-specific prompt
 * according to the approved prompt pack framework.
 */

const SHARED_PROMPT_PATH = join(process.cwd(), "docs/system-prompts/shared_directives.prompt");
const APP_PROMPT_PATH = join(process.cwd(), "docs/system-prompts/student_pilot.prompt");

let cachedPrompt: string | null = null;
let cachedHash: string | null = null;

/**
 * Load the full system prompt (shared directives + app overlay)
 */
export function loadSystemPrompt(): string {
  if (cachedPrompt) {
    return cachedPrompt;
  }

  try {
    const sharedDirectives = readFileSync(SHARED_PROMPT_PATH, "utf-8");
    const appPrompt = readFileSync(APP_PROMPT_PATH, "utf-8");
    
    // Concatenate: shared directives first, then app overlay
    cachedPrompt = `${sharedDirectives}\n\n---\n\n${appPrompt}`;
    
    return cachedPrompt;
  } catch (error) {
    console.error("❌ Failed to load system prompts:", error);
    throw new Error("System prompts not available");
  }
}

/**
 * Get the SHA-256 hash of the current system prompt
 * Used for verification and prompt version tracking
 */
export function getPromptHash(): string {
  if (cachedHash) {
    return cachedHash;
  }

  const prompt = loadSystemPrompt();
  cachedHash = createHash("sha256").update(prompt).digest("hex").substring(0, 16);
  
  return cachedHash;
}

/**
 * Get prompt metadata for logging and verification
 */
export function getPromptMetadata() {
  return {
    app: "student_pilot",
    promptVersion: "v1.0",
    promptHash: getPromptHash(),
    sharedPromptPath: SHARED_PROMPT_PATH,
    appPromptPath: APP_PROMPT_PATH,
  };
}
