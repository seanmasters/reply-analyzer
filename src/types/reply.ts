// src/types/reply.ts
export interface ReplySettings {
    replyToQuestions: boolean;
    replyToStatements: boolean;
    toneMatch: string;
    keywords: string[];
    blockedTerms: string[];
    model: string;
  }
  
  export interface AnalysisResult {
    type: 'question' | 'statement';
    intent: string;
    tone: string;
    keywords: string[];
    engagement_value: number;
    recommendation: boolean;
    reason: string;
    shouldReply: boolean;
    hasKeywords?: boolean;
    matchedKeywords?: string[];
    blockedTermsFound?: string[];
  }