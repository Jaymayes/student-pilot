import { readFileSync } from "fs";
import { join } from "path";
import { createHash } from "crypto";

/**
 * System Prompt Loader (Hybrid Mode)
 * 
 * Supports two modes via PROMPT_MODE environment variable:
 * - "separate": Load shared_directives.prompt + app-specific .prompt file
 * - "universal": Load universal.prompt and extract [SHARED] + [APP: {app_key}]
 * 
 * Default: "separate" for backward compatibility
 */

const SHARED_PROMPT_PATH = join(process.cwd(), "docs/system-prompts/shared_directives.prompt");
const APP_PROMPT_PATH = join(process.cwd(), "docs/system-prompts/student_pilot.prompt");
const UNIVERSAL_PROMPT_PATH = join(process.cwd(), "docs/system-prompts/universal.prompt");

const PROMPT_MODE = process.env.PROMPT_MODE || "separate";
const APP_NAME = process.env.APP_NAME || "student_pilot";

let cachedPrompt: string | null = null;
let cachedHash: string | null = null;
let cachedUniversalPrompt: string | null = null;

/**
 * Extract [SHARED] section from universal prompt
 */
function extractSharedSection(universalPrompt: string): string {
  const sharedMatch = universalPrompt.match(/\[SHARED\]([\s\S]*?)(?=\[APP:|$)/);
  return sharedMatch ? sharedMatch[1].trim() : "";
}

/**
 * Extract specific [APP: {app_key}] section from universal prompt
 */
function extractAppOverlay(universalPrompt: string, appKey: string): string {
  const appPattern = new RegExp(`\\[APP: ${appKey}\\]([\\s\\S]*?)(?=\\[APP:|\\[FAILSAFE\\]|$)`);
  const appMatch = universalPrompt.match(appPattern);
  return appMatch ? appMatch[1].trim() : "";
}

/**
 * Load universal.prompt and parse runtime overlay based on APP_NAME
 */
function loadUniversalPrompt(appKey: string): string {
  try {
    const universalPrompt = readFileSync(UNIVERSAL_PROMPT_PATH, "utf-8");
    cachedUniversalPrompt = universalPrompt;
    
    const shared = extractSharedSection(universalPrompt);
    const appOverlay = extractAppOverlay(universalPrompt, appKey);
    
    if (!appOverlay) {
      console.error(`⚠️  No [APP: ${appKey}] overlay found in universal.prompt`);
      throw new Error(`App overlay not found for: ${appKey}`);
    }
    
    return `${shared}\n\n---\n\n${appOverlay}`;
  } catch (error) {
    console.error("❌ Failed to load universal prompt:", error);
    throw new Error("Universal prompt not available");
  }
}

/**
 * Load separate prompt files (backward compatibility)
 */
function loadSeparatePrompts(): string {
  try {
    const sharedDirectives = readFileSync(SHARED_PROMPT_PATH, "utf-8");
    const appPrompt = readFileSync(APP_PROMPT_PATH, "utf-8");
    
    return `${sharedDirectives}\n\n---\n\n${appPrompt}`;
  } catch (error) {
    console.error("❌ Failed to load separate prompts:", error);
    throw new Error("System prompts not available");
  }
}

/**
 * Load the full system prompt (shared directives + app overlay)
 * Supports both separate and universal modes
 */
export function loadSystemPrompt(): string {
  if (cachedPrompt) {
    return cachedPrompt;
  }

  try {
    if (PROMPT_MODE === "universal") {
      console.log(`🔄 Loading universal prompt with overlay: ${APP_NAME}`);
      cachedPrompt = loadUniversalPrompt(APP_NAME);
    } else {
      console.log(`🔄 Loading separate prompts (legacy mode)`);
      cachedPrompt = loadSeparatePrompts();
    }
    
    return cachedPrompt;
  } catch (error) {
    console.error("❌ Failed to load system prompt:", error);
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
 * Get the raw universal prompt (all overlays)
 */
export function getRawUniversalPrompt(): string | null {
  if (cachedUniversalPrompt) {
    return cachedUniversalPrompt;
  }
  
  try {
    return readFileSync(UNIVERSAL_PROMPT_PATH, "utf-8");
  } catch (error) {
    return null;
  }
}

/**
 * Get a specific app overlay from universal prompt (for debugging)
 */
export function getAppOverlay(appKey: string): string | null {
  const universal = getRawUniversalPrompt();
  if (!universal) return null;
  
  return extractAppOverlay(universal, appKey) || null;
}

/**
 * Get merged prompt for a specific app (SHARED + APP overlay)
 */
export function getMergedPrompt(appKey: string): string | null {
  try {
    const universal = getRawUniversalPrompt();
    if (!universal) return null;
    
    const shared = extractSharedSection(universal);
    const appOverlay = extractAppOverlay(universal, appKey);
    
    if (!appOverlay) return null;
    
    return `${shared}\n\n---\n\n${appOverlay}`;
  } catch (error) {
    return null;
  }
}

/**
 * Get prompt metadata for logging and verification
 */
export function getPromptMetadata() {
  return {
    app: APP_NAME,
    promptVersion: "v1.0",
    promptMode: PROMPT_MODE,
    promptHash: getPromptHash(),
    sharedPromptPath: SHARED_PROMPT_PATH,
    appPromptPath: APP_PROMPT_PATH,
    universalPromptPath: UNIVERSAL_PROMPT_PATH,
  };
}
