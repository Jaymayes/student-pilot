import { readFileSync } from "fs";
import { join } from "path";
import { createHash } from "crypto";
import { emitBusinessEvent } from "../services/businessEvents";

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

/**
 * Detect app key using v1.1 Section A rules:
 * 1. APP_OVERLAY env var (if set)
 * 2. Hostname detection (if matches pattern)
 * 3. AUTH_CLIENT_ID (convert hyphens to underscores)
 * 4. APP_NAME fallback
 * 5. Default to executive_command_center
 * 
 * Returns: { appKey, detectionMethod }
 */
function detectAppKey(): { appKey: string; detectionMethod: string } {
  // 1. Check APP_OVERLAY env var (v1.1 primary method)
  if (process.env.APP_OVERLAY) {
    return { appKey: process.env.APP_OVERLAY, detectionMethod: "APP_OVERLAY" };
  }
  
  // 2. Check hostname detection (v1.1 fallback)
  const hostname = process.env.REPLIT_DOMAINS || "";
  if (hostname.includes("executive-command-center")) return { appKey: "executive_command_center", detectionMethod: "hostname" };
  if (hostname.includes("scholarship-agent")) return { appKey: "scholarship_agent", detectionMethod: "hostname" };
  if (hostname.includes("scholarship-api")) return { appKey: "scholarship_api", detectionMethod: "hostname" };
  if (hostname.includes("auto-page-maker")) return { appKey: "auto_page_maker", detectionMethod: "hostname" };
  if (hostname.includes("student-pilot")) return { appKey: "student_pilot", detectionMethod: "hostname" };
  if (hostname.includes("provider-register")) return { appKey: "provider_register", detectionMethod: "hostname" };
  if (hostname.includes("scholar-auth")) return { appKey: "scholar_auth", detectionMethod: "hostname" };
  if (hostname.includes("scholarship-sage")) return { appKey: "scholarship_sage", detectionMethod: "hostname" };
  
  // 3. Check AUTH_CLIENT_ID (Scholar Auth integration)
  if (process.env.AUTH_CLIENT_ID) {
    const clientId = process.env.AUTH_CLIENT_ID.replace(/-/g, "_");
    return { appKey: clientId, detectionMethod: "AUTH_CLIENT_ID" };
  }
  
  // 4. Check APP_NAME (v1.0 compatibility)
  if (process.env.APP_NAME) {
    return { appKey: process.env.APP_NAME, detectionMethod: "APP_NAME" };
  }
  
  // 5. Default to executive_command_center per Section A
  return { appKey: "executive_command_center", detectionMethod: "default" };
}

const { appKey: APP_NAME, detectionMethod: DETECTION_METHOD } = detectAppKey();

/**
 * Emit overlay_selected event per Section A requirement
 * Fire-and-forget to avoid blocking server startup
 */
function emitOverlaySelected() {
  emitBusinessEvent({
    eventName: "overlay_selected",
    actorType: "system",
    properties: {
      app_key: APP_NAME,
      detection_method: DETECTION_METHOD,
      host: process.env.REPLIT_DOMAINS || "localhost",
      mode: PROMPT_MODE,
      prompt_version: "v1.1"
    }
  }).catch((error) => {
    console.error("⚠️  Failed to emit overlay_selected event:", error);
  });
}

// Emit on module load (server startup)
emitOverlaySelected();

let cachedPrompt: string | null = null;
let cachedHash: string | null = null;
let cachedUniversalPrompt: string | null = null;

/**
 * Extract [SHARED] section from universal prompt (v1.0 format)
 * OR Sections A-H (excluding F) from v1.1 format
 */
function extractSharedSection(universalPrompt: string): string {
  // Try v1.0 format: [SHARED]
  const v1SharedMatch = universalPrompt.match(/\[SHARED\]([\s\S]*?)(?=\[APP:|$)/);
  if (v1SharedMatch) {
    return v1SharedMatch[1].trim();
  }
  
  // Try v1.1 compact format: A) ... B) ... (exclude F)
  // Extract A, B-E, G-H (skip F which contains overlays)
  const sectionA = universalPrompt.match(/A\) Routing and Isolation([\s\S]*?)(?=\nB\) )/);
  const sectionsB_E = universalPrompt.match(/(B\) Company Core[\s\S]*?)(?=\nF\) App Overlays)/);
  const sectionsG_H = universalPrompt.match(/(G\) Operating Procedure[\s\S]*?)$/);
  
  const parts = [];
  if (sectionA) parts.push(`A) Routing and Isolation${sectionA[1].trim()}`);
  if (sectionsB_E) parts.push(sectionsB_E[1].trim());
  if (sectionsG_H) parts.push(sectionsG_H[1].trim());
  
  if (parts.length > 0) {
    return parts.join('\n\n');
  }
  
  // Fallback: Try old "Section A —" format
  const oldSectionA = universalPrompt.match(/Section A —[^\n]*\n([\s\S]*?)(?=\nSection B —)/);
  const oldSectionsB_E = universalPrompt.match(/(Section B —[\s\S]*?)(?=\nSection F —)/);
  const oldSectionsG_H = universalPrompt.match(/(Section G —[\s\S]*?)$/);
  
  const oldParts = [];
  if (oldSectionA) oldParts.push(`Section A — How Agent3 must use this prompt\n${oldSectionA[1].trim()}`);
  if (oldSectionsB_E) oldParts.push(oldSectionsB_E[1].trim());
  if (oldSectionsG_H) oldParts.push(oldSectionsG_H[1].trim());
  
  return oldParts.join('\n\n');
}

/**
 * Extract specific [APP: {app_key}] section from universal prompt (v1.0)
 * OR Overlay: {app_key} / numbered overlay section from v1.1
 */
function extractAppOverlay(universalPrompt: string, appKey: string): string {
  // Try v1.1 numbered format: "1. executive_command_center" or "3. student_pilot (B2C revenue)"
  // Extract from the number+name line to the next numbered overlay or section G
  const numberedPattern = new RegExp(`\\d+\\.\\s+${appKey}[^\\n]*\\n\\n([\\s\\S]*?)(?=\\n\\d+\\.|\\nG\\) Operating Procedure|$)`);
  const numberedMatch = universalPrompt.match(numberedPattern);
  if (numberedMatch) {
    return numberedMatch[1].trim();
  }
  
  // Try v1.1 compact format: Overlay: {app_key} (ends at next Overlay: or G))
  const v1_1Pattern = new RegExp(`Overlay: ${appKey}\\s*\\n\\n([\\s\\S]*?)(?=\\n\\nOverlay:|\\nG\\) Operating Procedure|$)`);
  const v1_1Match = universalPrompt.match(v1_1Pattern);
  if (v1_1Match) {
    return v1_1Match[1].trim();
  }
  
  // Fallback: Try old format with "Section G" boundary
  const oldPattern = new RegExp(`Overlay: ${appKey}\\s*([\\s\\S]*?)(?=Overlay:|Section G|$)`);
  const oldMatch = universalPrompt.match(oldPattern);
  if (oldMatch) {
    return oldMatch[1].trim();
  }
  
  // Try v1.0 format: [APP: {app_key}]
  const v1Pattern = new RegExp(`\\[APP: ${appKey}\\]([\\s\\S]*?)(?=\\[APP:|\\[FAILSAFE\\]|$)`);
  const v1Match = universalPrompt.match(v1Pattern);
  if (v1Match) {
    return v1Match[1].trim();
  }
  
  return "";
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
      console.error(`⚠️  No overlay found for app: ${appKey} (tried both v1.0 [APP: ${appKey}] and v1.1 Overlay: ${appKey} formats)`);
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
