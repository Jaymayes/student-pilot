import OpenAI from "openai";
import { env } from "./environment";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });

export interface EssayFeedback {
  overallScore: number;
  strengths: string[];
  improvements: string[];
  suggestions: string;
  wordCount: number;
}

export interface ScholarshipMatchAnalysis {
  matchScore: number;
  matchReason: string[];
  chanceLevel: "High Chance" | "Competitive" | "Long Shot";
}

export class OpenAIService {
  private openai: OpenAI;

  constructor() {
    // Environment validation is already done in environment.ts
    this.openai = openai;
  }

  // Core method: Make OpenAI call with automatic billing
  async callOpenAIWithBilling(params: {
    userId: string;
    model: string;
    messages: Array<{ role: string; content: string }>;
    maxTokens?: number;
    temperature?: number;
    dryRun?: boolean;
  }): Promise<{
    response: any;
    usage: {
      inputTokens: number;
      outputTokens: number;
      chargedCredits: number;
      chargedUsd: number;
    };
  }> {
    const { userId, model, messages, maxTokens, temperature = 0.7, dryRun = false } = params;

    // Import billing service here to avoid circular imports
    const { billingService, PaymentRequiredError, millicreditsToCredits } = await import("./billing");
    
    // Get rounding mode from environment
    const roundingMode = (process.env.ROUNDING_MODE as "exact" | "ceil") || "exact";

    if (dryRun) {
      // For dry run, estimate tokens (simplified estimation)
      const estimatedInputTokens = JSON.stringify(messages).length / 4; // rough estimate
      const estimatedOutputTokens = maxTokens || 500; // use maxTokens or reasonable default

      const estimate = await billingService.estimateCharge(
        model,
        estimatedInputTokens,
        estimatedOutputTokens
      );

      // Return mock response for dry run
      return {
        response: {
          choices: [{
            message: { content: "[DRY RUN - No actual API call made]" }
          }]
        },
        usage: {
          inputTokens: estimatedInputTokens,
          outputTokens: estimatedOutputTokens,
          chargedCredits: estimate.creditsRequired,
          chargedUsd: estimate.usdEquivalent,
        },
      };
    }

    // Make the actual OpenAI API call
    const response = await openai.chat.completions.create({
      model,
      messages,
      max_tokens: maxTokens,
      temperature,
    });

    // Extract usage information
    const usage = response.usage;
    if (!usage) {
      throw new Error("OpenAI response missing usage information. Cannot charge without token counts.");
    }

    const inputTokens = usage.prompt_tokens;
    const outputTokens = usage.completion_tokens;

    // Charge the user for usage
    try {
      const billingResult = await billingService.chargeForUsage(
        userId,
        model,
        inputTokens,
        outputTokens,
        response.id,
        roundingMode
      );

      const chargedCredits = millicreditsToCredits(billingResult.chargedMillicredits);

      return {
        response,
        usage: {
          inputTokens,
          outputTokens,
          chargedCredits,
          chargedUsd: chargedCredits / 1000, // credits to USD
        },
      };
    } catch (error) {
      if (error instanceof PaymentRequiredError) {
        // Re-throw with more context for API consumers
        throw new PaymentRequiredError(
          error.requiredCredits,
          error.currentCredits,
          `Insufficient credits for ${model} usage. Required: ${error.requiredCredits.toFixed(2)} credits, Available: ${error.currentCredits.toFixed(2)} credits`
        );
      }
      throw error;
    }
  }

  // Generate essay feedback and suggestions (with billing)
  async analyzeEssay(content: string, prompt?: string, userId?: string): Promise<EssayFeedback & { usage?: any }> {
    try {
      const systemPrompt = `You are an expert essay coach helping students improve their scholarship applications. Analyze the essay and provide constructive feedback. Respond with JSON in this format:
      {
        "overallScore": number (1-10),
        "strengths": ["strength1", "strength2"],
        "improvements": ["improvement1", "improvement2"],
        "suggestions": "detailed suggestion text",
        "wordCount": number
      }`;

      const userPrompt = prompt 
        ? `Essay Prompt: ${prompt}\n\nEssay Content: ${content}`
        : `Essay Content: ${content}`;

      let response, usage;
      
      if (userId) {
        // Use billing-enabled version
        const result = await this.callOpenAIWithBilling({
          userId,
          model: "gpt-4o",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt }
          ],
          maxTokens: 800,
          temperature: 0.7,
        });
        response = result.response;
        usage = result.usage;
      } else {
        // Legacy mode without billing
        response = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt }
          ],
          response_format: { type: "json_object" },
          temperature: 0.7,
        });
      }

      const result = JSON.parse(response.choices[0].message.content || "{}");
      
      return {
        overallScore: Math.max(1, Math.min(10, result.overallScore || 5)),
        strengths: Array.isArray(result.strengths) ? result.strengths : [],
        improvements: Array.isArray(result.improvements) ? result.improvements : [],
        suggestions: result.suggestions || "",
        wordCount: result.wordCount || content.trim().split(/\s+/).length,
        ...(usage && { usage }), // Include usage info if billing was used
      };
    } catch (error) {
      console.error("Error analyzing essay:", error);
      throw new Error("Failed to analyze essay");
    }
  }

  // Generate essay outline based on prompt
  async generateEssayOutline(prompt: string, essayType: string = "general"): Promise<any> {
    try {
      const systemPrompt = `You are an expert essay coach. Generate a detailed essay outline for scholarship applications. Respond with JSON in this format:
      {
        "title": "suggested essay title",
        "structure": {
          "introduction": {
            "hook": "engaging opening line",
            "background": "brief context",
            "thesis": "clear thesis statement"
          },
          "body": [
            {
              "paragraph": 1,
              "topic": "main point",
              "details": ["supporting detail 1", "supporting detail 2"],
              "examples": ["example or story"]
            }
          ],
          "conclusion": {
            "summary": "recap main points",
            "impact": "future goals or impact",
            "closing": "memorable closing thought"
          }
        },
        "tips": ["writing tip 1", "writing tip 2"]
      }`;

      const userPrompt = `Essay Type: ${essayType}\nPrompt: ${prompt}`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        response_format: { type: "json_object" },
        temperature: 0.8,
      });

      return JSON.parse(response.choices[0].message.content || "{}");
    } catch (error) {
      console.error("Error generating outline:", error);
      throw new Error("Failed to generate essay outline");
    }
  }

  // Analyze scholarship match based on student profile
  async analyzeScholarshipMatch(
    studentProfile: any,
    scholarshipCriteria: any
  ): Promise<ScholarshipMatchAnalysis> {
    try {
      const systemPrompt = `You are an expert scholarship advisor. Analyze how well a student matches a scholarship opportunity. Consider academic qualifications, demographics, interests, and requirements. Respond with JSON in this format:
      {
        "matchScore": number (0-100),
        "matchReason": ["reason1", "reason2"],
        "chanceLevel": "High Chance" | "Competitive" | "Long Shot"
      }`;

      const userPrompt = `Student Profile: ${JSON.stringify(studentProfile)}\n\nScholarship Criteria: ${JSON.stringify(scholarshipCriteria)}`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        response_format: { type: "json_object" },
        temperature: 0.3,
      });

      const result = JSON.parse(response.choices[0].message.content || "{}");
      
      return {
        matchScore: Math.max(0, Math.min(100, result.matchScore || 0)),
        matchReason: Array.isArray(result.matchReason) ? result.matchReason : [],
        chanceLevel: ["High Chance", "Competitive", "Long Shot"].includes(result.chanceLevel) 
          ? result.chanceLevel 
          : "Competitive",
      };
    } catch (error) {
      console.error("Error analyzing scholarship match:", error);
      throw new Error("Failed to analyze scholarship match");
    }
  }

  // Generate personalized essay suggestions
  async generateEssayIdeas(studentProfile: any, essayType: string): Promise<string[]> {
    try {
      const systemPrompt = `You are an expert essay coach. Based on a student's profile, suggest 5-7 compelling essay topics that would make them stand out in scholarship applications. Respond with JSON in this format:
      {
        "ideas": ["idea1", "idea2", "idea3"]
      }`;

      const userPrompt = `Student Profile: ${JSON.stringify(studentProfile)}\nEssay Type: ${essayType}`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        response_format: { type: "json_object" },
        temperature: 0.8,
      });

      const result = JSON.parse(response.choices[0].message.content || "{}");
      return Array.isArray(result.ideas) ? result.ideas : [];
    } catch (error) {
      console.error("Error generating essay ideas:", error);
      throw new Error("Failed to generate essay ideas");
    }
  }

  // Improve essay content with AI suggestions
  async improveEssayContent(content: string, focusArea: string = "overall"): Promise<string> {
    try {
      const systemPrompt = `You are an expert essay editor. Improve the given essay content while maintaining the student's voice and authenticity. Focus on: ${focusArea}. Return only the improved essay content, no additional formatting or explanations.`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: content }
        ],
        temperature: 0.5,
      });

      return response.choices[0].message.content || content;
    } catch (error) {
      console.error("Error improving essay content:", error);
      throw new Error("Failed to improve essay content");
    }
  }
}

export const openaiService = new OpenAIService();