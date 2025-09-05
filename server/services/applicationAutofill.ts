import { openaiService } from "../openai";
import { storage } from "../storage";

// Audit trail for tracking all autofill suggestions
interface AutofillAuditLog {
  id: string;
  userId: string;
  studentId: string;
  scholarshipId: string;
  suggestionType: 'autofill' | 'essay_assistance';
  fieldName: string;
  originalValue: string;
  suggestedValue: string;
  explanation: string;
  confidence: number;
  source: 'profile' | 'ai_generated' | 'template';
  usedByUser: boolean;
  timestamp: Date;
  safetyFlags: string[];
}

interface FormFieldMapping {
  fieldName: string;
  fieldType: 'text' | 'textarea' | 'number' | 'date' | 'select' | 'checkbox';
  profileMapping?: string; // Path to student profile field
  aiGenerated?: boolean;
  required?: boolean;
  maxLength?: number;
  validationRules?: string[];
}

interface AutofillResult {
  fieldName: string;
  suggestedValue: string;
  confidence: number; // 0-1 scale
  source: 'profile' | 'ai_generated' | 'template';
  explanation: string;
  safetyFlags: string[];
  traceId: string;
}

interface SafetyValidationResult {
  isValid: boolean;
  flags: string[];
  explanation: string;
  riskLevel: 'low' | 'medium' | 'high';
}

class ApplicationAutofillService {
  private auditLogs: AutofillAuditLog[] = [];

  // Common scholarship application field mappings
  private commonFieldMappings: FormFieldMapping[] = [
    { fieldName: 'firstName', fieldType: 'text', profileMapping: 'personalInfo.firstName', required: true },
    { fieldName: 'lastName', fieldType: 'text', profileMapping: 'personalInfo.lastName', required: true },
    { fieldName: 'email', fieldType: 'text', profileMapping: 'personalInfo.email', required: true },
    { fieldName: 'phone', fieldType: 'text', profileMapping: 'personalInfo.phone' },
    { fieldName: 'address', fieldType: 'textarea', profileMapping: 'personalInfo.address' },
    { fieldName: 'dateOfBirth', fieldType: 'date', profileMapping: 'personalInfo.dateOfBirth' },
    { fieldName: 'gpa', fieldType: 'number', profileMapping: 'academicInfo.gpa' },
    { fieldName: 'major', fieldType: 'text', profileMapping: 'academicInfo.major' },
    { fieldName: 'school', fieldType: 'text', profileMapping: 'academicInfo.school' },
    { fieldName: 'graduationYear', fieldType: 'number', profileMapping: 'academicInfo.graduationYear' },
    { fieldName: 'activities', fieldType: 'textarea', profileMapping: 'activities', aiGenerated: true },
    { fieldName: 'achievements', fieldType: 'textarea', profileMapping: 'achievements', aiGenerated: true },
    { fieldName: 'careerGoals', fieldType: 'textarea', aiGenerated: true, maxLength: 500 },
    { fieldName: 'whyDeserveScholarship', fieldType: 'textarea', aiGenerated: true, maxLength: 1000 },
  ];

  async autofillApplication(
    userId: string,
    studentId: string, 
    scholarshipId: string,
    formFields: string[]
  ): Promise<AutofillResult[]> {
    try {
      // Get student profile data
      const studentProfile = await storage.getStudentProfile(studentId);
      if (!studentProfile) {
        throw new Error('Student profile not found');
      }

      const results: AutofillResult[] = [];

      for (const fieldName of formFields) {
        const mapping = this.commonFieldMappings.find(m => m.fieldName === fieldName);
        if (!mapping) continue;

        const result = await this.generateFieldSuggestion(
          userId,
          studentId,
          scholarshipId,
          fieldName,
          mapping,
          studentProfile
        );

        if (result) {
          results.push(result);
        }
      }

      return results;
    } catch (error) {
      console.error("Error in autofill application:", error);
      throw new Error("Failed to generate autofill suggestions");
    }
  }

  private async generateFieldSuggestion(
    userId: string,
    studentId: string,
    scholarshipId: string,
    fieldName: string,
    mapping: FormFieldMapping,
    studentProfile: any
  ): Promise<AutofillResult | null> {
    const traceId = `autofill_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    try {
      let suggestedValue = '';
      let source: 'profile' | 'ai_generated' | 'template' = 'profile';
      let confidence = 1.0;
      let explanation = '';

      // First try direct profile mapping
      if (mapping.profileMapping && this.getNestedValue(studentProfile, mapping.profileMapping)) {
        suggestedValue = this.getNestedValue(studentProfile, mapping.profileMapping);
        explanation = `Pulled directly from your saved profile information`;
        confidence = 1.0;
      }
      // Generate AI content for complex fields
      else if (mapping.aiGenerated) {
        const aiResult = await this.generateAIContent(fieldName, studentProfile, scholarshipId);
        suggestedValue = aiResult.content;
        source = 'ai_generated';
        confidence = aiResult.confidence;
        explanation = aiResult.explanation;
      }

      if (!suggestedValue) return null;

      // Validate content for safety and academic integrity
      const safetyCheck = await this.validateContentSafety(suggestedValue, fieldName);
      
      // Log the suggestion for audit trail
      await this.logAutofillSuggestion({
        id: traceId,
        userId,
        studentId,
        scholarshipId,
        suggestionType: 'autofill',
        fieldName,
        originalValue: '',
        suggestedValue,
        explanation,
        confidence,
        source,
        usedByUser: false,
        timestamp: new Date(),
        safetyFlags: safetyCheck.flags
      });

      return {
        fieldName,
        suggestedValue: safetyCheck.isValid ? suggestedValue : '',
        confidence: safetyCheck.isValid ? confidence : 0,
        source,
        explanation: safetyCheck.isValid ? explanation : `Content blocked: ${safetyCheck.explanation}`,
        safetyFlags: safetyCheck.flags,
        traceId
      };

    } catch (error) {
      console.error(`Error generating suggestion for ${fieldName}:`, error);
      return null;
    }
  }

  private async generateAIContent(
    fieldName: string, 
    studentProfile: any, 
    scholarshipId: string
  ): Promise<{ content: string; confidence: number; explanation: string }> {
    
    const systemPrompts = {
      activities: `Generate a concise summary of the student's extracurricular activities based on their profile. Focus on leadership roles, community service, and achievements. Keep it authentic and avoid exaggeration. Limit to 200 words.`,
      achievements: `Summarize the student's academic and personal achievements based on their profile. Focus on concrete accomplishments with measurable impact. Be specific but humble. Limit to 200 words.`,
      careerGoals: `Based on the student's academic profile and interests, articulate clear, realistic career goals. Connect their education to future aspirations. Show ambition but remain grounded. Limit to 300 words.`,
      whyDeserveScholarship: `Create a compelling but honest explanation of why this student deserves the scholarship. Focus on their unique background, challenges overcome, and potential for impact. Avoid clichés and maintain authenticity. Limit to 500 words.`
    };

    const systemPrompt = systemPrompts[fieldName as keyof typeof systemPrompts] || 
      `Generate appropriate content for the field "${fieldName}" based on the student's profile. Keep it professional, authentic, and concise.`;

    try {
      // Get scholarship details for context
      let scholarshipContext = '';
      try {
        const scholarship = await storage.getScholarshipById(scholarshipId);
        if (scholarship) {
          scholarshipContext = `Scholarship: ${scholarship.title} - ${scholarship.description}`;
        }
      } catch (error) {
        console.warn('Could not fetch scholarship details for context');
      }

      const response = await openaiService.callOpenAIWithBilling({
        userId: studentProfile.userId,
        model: "gpt-4o",
        messages: [
          { 
            role: "system", 
            content: `${systemPrompt}

IMPORTANT SAFETY GUIDELINES:
- Only use information directly from the student's profile
- Do NOT invent achievements, experiences, or accomplishments
- Do NOT exaggerate or embellish facts
- Keep content authentic and honest
- Avoid academic dishonesty red flags
- If insufficient profile data, return a brief, honest statement

Respond with JSON: {"content": "generated text", "confidence": 0.0-1.0, "explanation": "brief explanation of approach"}`
          },
          { 
            role: "user", 
            content: `Student Profile: ${JSON.stringify(studentProfile)}\n${scholarshipContext}\n\nGenerate content for: ${fieldName}` 
          }
        ],
        maxTokens: 600,
        temperature: 0.3,
      });

      const result = JSON.parse(response.response.choices[0].message.content || '{}');
      
      return {
        content: result.content || '',
        confidence: Math.min(Math.max(result.confidence || 0.5, 0), 1),
        explanation: result.explanation || 'AI-generated based on your profile data'
      };

    } catch (error) {
      console.error("Error generating AI content:", error);
      return {
        content: '',
        confidence: 0,
        explanation: 'Unable to generate content'
      };
    }
  }

  private async validateContentSafety(content: string, fieldName: string): Promise<SafetyValidationResult> {
    try {
      const response = await openaiService.callOpenAIWithBilling({
        userId: 'system',
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are a content safety validator for scholarship applications. Analyze the content for academic integrity violations and inappropriate material.

FLAG THE FOLLOWING:
- Plagiarism indicators
- Exaggerated or unverifiable claims
- Inappropriate personal information
- Generic/template language
- Dishonest statements
- Professionally inappropriate content

Respond with JSON: {
  "isValid": boolean,
  "flags": ["flag1", "flag2"],
  "explanation": "brief explanation",
  "riskLevel": "low|medium|high"
}`
          },
          {
            role: "user", 
            content: `Field: ${fieldName}\nContent: ${content}`
          }
        ],
        maxTokens: 300,
        temperature: 0.1,
      });

      const result = JSON.parse(response.response.choices[0].message.content || '{}');
      
      return {
        isValid: result.isValid !== false, // Default to valid if unclear
        flags: Array.isArray(result.flags) ? result.flags : [],
        explanation: result.explanation || 'Content validation completed',
        riskLevel: ['low', 'medium', 'high'].includes(result.riskLevel) ? result.riskLevel : 'low'
      };

    } catch (error) {
      console.error("Error validating content safety:", error);
      // Default to safe if validation fails
      return {
        isValid: true,
        flags: ['validation_error'],
        explanation: 'Safety validation encountered an error',
        riskLevel: 'medium'
      };
    }
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  private async logAutofillSuggestion(logEntry: AutofillAuditLog): Promise<void> {
    this.auditLogs.push(logEntry);
    
    // In a real implementation, this would be stored in the database
    console.log(`[AUTOFILL AUDIT] ${logEntry.id}: ${logEntry.suggestionType} suggestion for ${logEntry.fieldName}`, {
      userId: logEntry.userId,
      confidence: logEntry.confidence,
      source: logEntry.source,
      safetyFlags: logEntry.safetyFlags
    });
  }

  async trackSuggestionUsage(traceId: string, used: boolean): Promise<void> {
    const logEntry = this.auditLogs.find(log => log.id === traceId);
    if (logEntry) {
      logEntry.usedByUser = used;
      console.log(`[AUTOFILL TRACKING] Suggestion ${traceId} ${used ? 'accepted' : 'rejected'} by user`);
    }
  }

  async getAuditTrail(userId: string, studentId?: string): Promise<AutofillAuditLog[]> {
    return this.auditLogs.filter(log => 
      log.userId === userId && (!studentId || log.studentId === studentId)
    );
  }

  // Get explainability data for a suggestion
  async explainSuggestion(traceId: string): Promise<{
    explanation: string;
    reasoning: string[];
    confidence: number;
    sources: string[];
    safetyChecks: string[];
  } | null> {
    const logEntry = this.auditLogs.find(log => log.id === traceId);
    if (!logEntry) return null;

    return {
      explanation: logEntry.explanation,
      reasoning: [
        `Suggestion generated from ${logEntry.source}`,
        `Field type: ${logEntry.fieldName}`,
        `Confidence level: ${(logEntry.confidence * 100).toFixed(0)}%`
      ],
      confidence: logEntry.confidence,
      sources: [logEntry.source],
      safetyChecks: logEntry.safetyFlags.length > 0 ? logEntry.safetyFlags : ['Passed all safety checks']
    };
  }
}

export const applicationAutofillService = new ApplicationAutofillService();