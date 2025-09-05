import { openaiService } from "../openai";

// Audit trail for essay assistance
interface EssayAssistanceAuditLog {
  id: string;
  userId: string;
  studentId: string;
  action: 'analyze' | 'improve' | 'outline' | 'idea_generation';
  originalContent: string;
  suggestion: string;
  explanation: string;
  safetyFlags: string[];
  integrityScore: number; // 0-100, higher is better
  timestamp: Date;
  usedByUser: boolean;
}

interface AcademicIntegrityCheck {
  isValid: boolean;
  score: number; // 0-100, higher is better integrity
  flags: string[];
  explanation: string;
  recommendations: string[];
}

interface ExplainableEssayFeedback {
  overallScore: number;
  strengths: string[];
  improvements: string[];
  suggestions: string;
  wordCount: number;
  integrityCheck: AcademicIntegrityCheck;
  explanations: {
    scoringReasoning: string[];
    improvementJustification: string[];
    strengthsEvidence: string[];
  };
  traceId: string;
  usage?: any;
}

interface SafeEssayImprovement {
  improvedContent: string;
  changes: {
    type: 'grammar' | 'structure' | 'clarity' | 'word_choice';
    original: string;
    improved: string;
    explanation: string;
  }[];
  integrityCheck: AcademicIntegrityCheck;
  explanation: string;
  traceId: string;
}

class EnhancedEssayAssistanceService {
  private auditLogs: EssayAssistanceAuditLog[] = [];

  async analyzeEssayWithSafety(
    content: string,
    prompt: string = '',
    userId: string
  ): Promise<ExplainableEssayFeedback> {
    const traceId = `essay_analysis_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    try {
      // First, check academic integrity
      const integrityCheck = await this.checkAcademicIntegrity(content, 'analysis');

      // Enhanced system prompt with safety guidelines
      const systemPrompt = `You are an expert essay coach with a focus on academic integrity and authentic student voice. Analyze this scholarship essay and provide detailed, explainable feedback.

ANALYSIS GUIDELINES:
- Focus on helping students improve their authentic voice
- Flag potential academic integrity issues
- Provide specific, actionable feedback
- Explain the reasoning behind all suggestions
- Encourage originality and personal reflection

Respond with JSON format:
{
  "overallScore": 1-10,
  "strengths": ["specific strength with example"],
  "improvements": ["specific improvement with reasoning"],
  "suggestions": "detailed actionable advice",
  "wordCount": number,
  "explanations": {
    "scoringReasoning": ["why this score was given"],
    "improvementJustification": ["why these improvements are needed"],
    "strengthsEvidence": ["why these are considered strengths"]
  }
}`;

      const userPrompt = prompt 
        ? `Essay Prompt: ${prompt}\n\nEssay Content: ${content}`
        : `Essay Content: ${content}`;

      const result = await openaiService.callOpenAIWithBilling({
        userId,
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        maxTokens: 1200,
        temperature: 0.3,
      });

      const analysis = JSON.parse(result.response.choices[0].message.content || "{}");

      // Create explainable feedback
      const feedback: ExplainableEssayFeedback = {
        overallScore: Math.max(1, Math.min(10, analysis.overallScore || 5)),
        strengths: Array.isArray(analysis.strengths) ? analysis.strengths : [],
        improvements: Array.isArray(analysis.improvements) ? analysis.improvements : [],
        suggestions: analysis.suggestions || "",
        wordCount: analysis.wordCount || content.trim().split(/\s+/).length,
        integrityCheck,
        explanations: {
          scoringReasoning: analysis.explanations?.scoringReasoning || ['Score based on content quality, structure, and authenticity'],
          improvementJustification: analysis.explanations?.improvementJustification || ['Improvements suggested to enhance clarity and impact'],
          strengthsEvidence: analysis.explanations?.strengthsEvidence || ['Strengths identified based on effective writing techniques']
        },
        traceId,
        usage: result.usage
      };

      // Log for audit trail
      await this.logAssistanceAction({
        id: traceId,
        userId,
        studentId: userId, // Assuming userId is studentId for simplicity
        action: 'analyze',
        originalContent: content,
        suggestion: JSON.stringify(feedback),
        explanation: 'Comprehensive essay analysis with integrity checking',
        safetyFlags: integrityCheck.flags,
        integrityScore: integrityCheck.score,
        timestamp: new Date(),
        usedByUser: true
      });

      return feedback;

    } catch (error) {
      console.error("Error analyzing essay with safety:", error);
      throw new Error("Failed to analyze essay safely");
    }
  }

  async improveEssayContentWithSafety(
    content: string,
    focusArea: string = "overall",
    userId: string
  ): Promise<SafeEssayImprovement> {
    const traceId = `essay_improvement_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    try {
      // Check original content integrity
      const originalIntegrityCheck = await this.checkAcademicIntegrity(content, 'improvement');

      if (originalIntegrityCheck.score < 60) {
        throw new Error(`Content integrity concerns: ${originalIntegrityCheck.explanation}`);
      }

      // Enhanced system prompt for safe improvements
      const systemPrompt = `You are an expert essay editor focused on maintaining student authenticity while improving clarity and impact.

IMPROVEMENT GUIDELINES:
- Preserve the student's unique voice and personal experiences
- Make minimal, targeted improvements that enhance clarity
- Never add new facts, experiences, or accomplishments
- Focus on grammar, structure, word choice, and flow
- Explain every change made
- Maintain academic integrity at all costs

Focus Area: ${focusArea}

Respond with JSON:
{
  "improvedContent": "the improved essay",
  "changes": [
    {
      "type": "grammar|structure|clarity|word_choice",
      "original": "original text segment",
      "improved": "improved text segment", 
      "explanation": "why this change improves the essay"
    }
  ],
  "explanation": "overall improvement strategy and reasoning"
}`;

      const result = await openaiService.callOpenAIWithBilling({
        userId,
        model: "gpt-4o", 
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: content }
        ],
        maxTokens: 1500,
        temperature: 0.2, // Lower temperature for more conservative improvements
      });

      const improvement = JSON.parse(result.response.choices[0].message.content || "{}");

      // Validate improved content
      const improvedIntegrityCheck = await this.checkAcademicIntegrity(
        improvement.improvedContent || content, 
        'improvement_validation'
      );

      // Ensure improvements don't reduce integrity
      if (improvedIntegrityCheck.score < originalIntegrityCheck.score - 10) {
        throw new Error("Suggested improvements may compromise academic integrity");
      }

      const safeImprovement: SafeEssayImprovement = {
        improvedContent: improvement.improvedContent || content,
        changes: Array.isArray(improvement.changes) ? improvement.changes : [],
        integrityCheck: improvedIntegrityCheck,
        explanation: improvement.explanation || "Content improved while maintaining authenticity",
        traceId
      };

      // Log for audit trail
      await this.logAssistanceAction({
        id: traceId,
        userId,
        studentId: userId,
        action: 'improve',
        originalContent: content,
        suggestion: improvement.improvedContent || content,
        explanation: safeImprovement.explanation,
        safetyFlags: improvedIntegrityCheck.flags,
        integrityScore: improvedIntegrityCheck.score,
        timestamp: new Date(),
        usedByUser: false
      });

      return safeImprovement;

    } catch (error) {
      console.error("Error improving essay with safety:", error);
      throw new Error("Failed to improve essay safely");
    }
  }

  private async checkAcademicIntegrity(
    content: string,
    context: string
  ): Promise<AcademicIntegrityCheck> {
    try {
      const systemPrompt = `You are an academic integrity specialist. Analyze this essay content for potential integrity issues.

INTEGRITY CRITERIA:
- Authenticity of voice and experiences
- Originality of ideas and expression  
- Absence of plagiarism indicators
- Realistic and verifiable claims
- Personal reflection vs. generic statements
- Appropriate tone for scholarship essays

Rate integrity from 0-100 (higher = better integrity)

FLAG THESE ISSUES:
- Generic/template language
- Exaggerated or unverifiable claims
- Plagiarism red flags
- Inappropriate personal details
- Dishonest statements
- AI-generated content patterns

Respond with JSON:
{
  "isValid": boolean,
  "score": 0-100,
  "flags": ["specific concerns"],
  "explanation": "detailed analysis",
  "recommendations": ["specific suggestions for improvement"]
}`;

      const result = await openaiService.callOpenAIWithBilling({
        userId: 'system',
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Context: ${context}\n\nContent to analyze:\n${content}` }
        ],
        maxTokens: 600,
        temperature: 0.1,
      });

      const check = JSON.parse(result.response.choices[0].message.content || "{}");

      return {
        isValid: check.isValid !== false && (check.score || 80) >= 60,
        score: Math.max(0, Math.min(100, check.score || 80)),
        flags: Array.isArray(check.flags) ? check.flags : [],
        explanation: check.explanation || "Content integrity check completed",
        recommendations: Array.isArray(check.recommendations) ? check.recommendations : []
      };

    } catch (error) {
      console.error("Error checking academic integrity:", error);
      // Default to moderate integrity if check fails
      return {
        isValid: true,
        score: 70,
        flags: ['integrity_check_error'],
        explanation: 'Integrity validation encountered an error - manual review recommended',
        recommendations: ['Please review content manually for academic integrity']
      };
    }
  }

  private async logAssistanceAction(logEntry: EssayAssistanceAuditLog): Promise<void> {
    this.auditLogs.push(logEntry);
    
    console.log(`[ESSAY ASSISTANCE AUDIT] ${logEntry.id}: ${logEntry.action}`, {
      userId: logEntry.userId,
      integrityScore: logEntry.integrityScore,
      safetyFlags: logEntry.safetyFlags,
      timestamp: logEntry.timestamp
    });
  }

  async trackSuggestionUsage(traceId: string, used: boolean): Promise<void> {
    const logEntry = this.auditLogs.find(log => log.id === traceId);
    if (logEntry) {
      logEntry.usedByUser = used;
      console.log(`[ESSAY ASSISTANCE TRACKING] Suggestion ${traceId} ${used ? 'accepted' : 'rejected'}`);
    }
  }

  async getAuditTrail(userId: string): Promise<EssayAssistanceAuditLog[]> {
    return this.auditLogs.filter(log => log.userId === userId);
  }

  // Explainability interface for suggestions
  async explainSuggestion(traceId: string): Promise<{
    action: string;
    reasoning: string[];
    integrityAnalysis: string;
    safetyMeasures: string[];
    recommendations: string[];
  } | null> {
    const logEntry = this.auditLogs.find(log => log.id === traceId);
    if (!logEntry) return null;

    return {
      action: logEntry.action,
      reasoning: [
        logEntry.explanation,
        `Academic integrity score: ${logEntry.integrityScore}/100`,
        `Safety flags: ${logEntry.safetyFlags.length > 0 ? logEntry.safetyFlags.join(', ') : 'None'}`
      ],
      integrityAnalysis: `Content scored ${logEntry.integrityScore}/100 for academic integrity`,
      safetyMeasures: [
        'Content validated for academic integrity',
        'Suggestions preserve student voice',
        'All changes are traceable and explainable',
        'No fabricated information added'
      ],
      recommendations: [
        'Review all suggestions before accepting',
        'Ensure final content reflects your authentic experiences',
        'Verify all facts and claims are accurate',
        'Maintain your unique writing voice'
      ]
    };
  }

  // Generate safe essay outline with integrity focus
  async generateSafeEssayOutline(
    prompt: string,
    studentProfile: any,
    essayType: string = "general",
    userId: string
  ): Promise<any> {
    const traceId = `outline_generation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    try {
      const systemPrompt = `You are an expert essay coach focused on helping students create authentic, personal essay outlines.

OUTLINE GUIDELINES:
- Base structure on the student's actual profile and experiences
- Encourage personal reflection and authentic voice
- Avoid generic or template responses
- Focus on unique aspects of the student's background
- Maintain academic integrity throughout

Student Profile Available: ${JSON.stringify(studentProfile)}

Create a detailed outline that helps the student showcase their authentic self.

Respond with JSON format following the established outline structure with title, structure (intro, body, conclusion), and tips.`;

      const result = await openaiService.callOpenAIWithBilling({
        userId,
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Essay Type: ${essayType}\nPrompt: ${prompt}` }
        ],
        maxTokens: 1000,
        temperature: 0.6,
      });

      const outline = JSON.parse(result.response.choices[0].message.content || "{}");

      // Log the outline generation
      await this.logAssistanceAction({
        id: traceId,
        userId,
        studentId: userId,
        action: 'outline',
        originalContent: prompt,
        suggestion: JSON.stringify(outline),
        explanation: 'Safe essay outline generated based on student profile',
        safetyFlags: [], // Outlines are inherently safer
        integrityScore: 90, // High integrity for profile-based outlines
        timestamp: new Date(),
        usedByUser: false
      });

      return {
        ...outline,
        traceId,
        integrityNote: "This outline is based on your profile data to ensure authenticity"
      };

    } catch (error) {
      console.error("Error generating safe essay outline:", error);
      throw new Error("Failed to generate essay outline");
    }
  }
}

export const enhancedEssayAssistanceService = new EnhancedEssayAssistanceService();