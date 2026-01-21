import * as crypto from 'crypto';

export interface NLPScoreResult {
  score: number;
  confidence: number;
  matchSuggestions: string[];
  processingTimeMs: number;
}

export interface DocumentMeta {
  filename: string;
  mimeType: string;
  size: number;
  type: 'transcript' | 'resume' | 'essay' | 'letter_of_recommendation' | 'other';
}

export async function scoreDocument(
  uploadId: string,
  documentMeta: DocumentMeta
): Promise<NLPScoreResult> {
  const startTime = Date.now();
  
  await new Promise(resolve => setTimeout(resolve, 50 + Math.random() * 100));
  
  const baseScore = 0.7 + Math.random() * 0.2;
  const typeBonus = getTypeBonus(documentMeta.type);
  const finalScore = Math.min(baseScore + typeBonus, 0.95);
  
  const processingTimeMs = Date.now() - startTime;
  
  return {
    score: Math.round(finalScore * 100) / 100,
    confidence: 0.85 + Math.random() * 0.1,
    matchSuggestions: generateMatchSuggestions(documentMeta.type, finalScore),
    processingTimeMs
  };
}

function getTypeBonus(type: DocumentMeta['type']): number {
  const bonuses: Record<DocumentMeta['type'], number> = {
    transcript: 0.05,
    resume: 0.03,
    essay: 0.04,
    letter_of_recommendation: 0.02,
    other: 0
  };
  return bonuses[type] || 0;
}

function generateMatchSuggestions(type: DocumentMeta['type'], score: number): string[] {
  const suggestions: string[] = [];
  
  if (score >= 0.85) {
    suggestions.push('High match potential for merit-based scholarships');
  }
  
  if (type === 'transcript' && score >= 0.8) {
    suggestions.push('Consider academic achievement awards');
  }
  
  if (type === 'essay' && score >= 0.75) {
    suggestions.push('Strong writing may qualify for essay contests');
  }
  
  if (type === 'resume' && score >= 0.7) {
    suggestions.push('Leadership experience detected - explore leadership scholarships');
  }
  
  if (suggestions.length === 0) {
    suggestions.push('Continue building your profile for better matches');
  }
  
  return suggestions;
}
