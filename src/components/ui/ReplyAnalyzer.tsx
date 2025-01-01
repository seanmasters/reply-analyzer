// src/components/ui/ReplyAnalyzer.tsx

"use client";

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Plus, X, Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ReplySettings, AnalysisResult } from '@/types/reply';

const ReplyAnalyzer: React.FC = () => {
  const [replySettings, setReplySettings] = useState<ReplySettings>({
    replyToQuestions: true,
    replyToStatements: false,
    toneMatch: '',
    keywords: [],
    blockedTerms: [],
    model: 'gpt-3.5-turbo'
  });

  const [inputText, setInputText] = useState<string>('');
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [newKeyword, setNewKeyword] = useState<string>('');
  const [newBlockedTerm, setNewBlockedTerm] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const analyzeText = async () => {
    if (!process.env.NEXT_PUBLIC_OPENAI_API_KEY) {
      setApiError('OpenAI API key not configured');
      return;
    }

    setIsAnalyzing(true);
    setApiError(null);

    try {
      // Check for blocked terms locally
      const hasBlockedTerms = replySettings.blockedTerms.some(term => 
        inputText.toLowerCase().includes(term.toLowerCase())
      );

      if (hasBlockedTerms) {
        setAnalysisResult({
          type: 'statement',
          intent: '',
          tone: '',
          keywords: [],
          engagement_value: 0,
          recommendation: false,
          shouldReply: false,
          reason: 'Contains blocked terms',
          blockedTermsFound: replySettings.blockedTerms.filter(term => 
            inputText.toLowerCase().includes(term.toLowerCase())
          )
        });
        setIsAnalyzing(false);
        return;
      }

      // Prepare the prompt for the LLM
      const prompt = {
        messages: [
          {
            role: 'system',
            content: `Analyze the following text and provide a JSON response with these fields:
              - type: "question" | "statement"
              - intent: brief description of the apparent intent
              - tone: description of the tone (professional, casual, aggressive, etc.)
              - keywords: array of important topical keywords
              - engagement_value: number 1-10 rating how much this deserves a response
              - recommendation: boolean whether to reply
              - reason: brief explanation of the recommendation`
          },
          {
            role: 'user',
            content: inputText
          }
        ],
        model: replySettings.model,
        temperature: 0.7,
        response_format: { type: "json_object" }
      };

      // Make API call to OpenAI
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_OPENAI_API_KEY}`
        },
        body: JSON.stringify(prompt)
      });

      if (!response.ok) {
        throw new Error('API call failed');
      }

      const data = await response.json();
      const analysis = JSON.parse(data.choices[0].message.content);

      // Combine LLM analysis with local rules
      const hasKeywords = replySettings.keywords.some(keyword => 
        inputText.toLowerCase().includes(keyword.toLowerCase())
      );

      const shouldReply = (
        (analysis.type === 'question' && replySettings.replyToQuestions) ||
        (analysis.type === 'statement' && replySettings.replyToStatements) ||
        hasKeywords ||
        analysis.engagement_value >= 7
      );

      setAnalysisResult({
        ...analysis,
        shouldReply,
        hasKeywords,
        matchedKeywords: replySettings.keywords.filter(keyword => 
          inputText.toLowerCase().includes(keyword.toLowerCase())
        )
      });

    } catch (error) {
      setApiError(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSwitchChange = (setting: keyof ReplySettings) => {
    setReplySettings(prev => ({
      ...prev,
      [setting]: !prev[setting]
    }));
  };

  const addKeyword = () => {
    if (newKeyword.trim()) {
      setReplySettings(prev => ({
        ...prev,
        keywords: [...prev.keywords, newKeyword.trim()]
      }));
      setNewKeyword('');
    }
  };

  const removeKeyword = (index: number) => {
    setReplySettings(prev => ({
      ...prev,
      keywords: prev.keywords.filter((_, i) => i !== index)
    }));
  };

  const addBlockedTerm = () => {
    if (newBlockedTerm.trim()) {
      setReplySettings(prev => ({
        ...prev,
        blockedTerms: [...prev.blockedTerms, newBlockedTerm.trim()]
      }));
      setNewBlockedTerm('');
    }
  };

  const removeBlockedTerm = (index: number) => {
    setReplySettings(prev => ({
      ...prev,
      blockedTerms: prev.blockedTerms.filter((_, i) => i !== index)
    }));
  };

  return (
    <div className="w-full max-w-2xl mx-auto p-4 space-y-4">
      {/* Text Analysis Section */}
      <Card>
        <CardHeader>
          <CardTitle>Text Analysis</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Model Selection */}
          <div className="space-y-2">
            <select
              className="w-full border rounded p-2"
              value={replySettings.model}
              onChange={(e) => setReplySettings(prev => ({
                ...prev,
                model: e.target.value
              }))}
            >
              <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
              <option value="gpt-4">GPT-4</option>
            </select>
          </div>

          <Textarea
            placeholder="Enter text to analyze..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            className="h-32"
          />
          
          <Button 
            onClick={analyzeText} 
            className="w-full"
            disabled={isAnalyzing}
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Analyzing...
              </>
            ) : (
              'Analyze Text'
            )}
          </Button>
          
          {apiError && (
            <Alert variant="destructive">
              <AlertDescription>{apiError}</AlertDescription>
            </Alert>
          )}
          
          {analysisResult && (
            <div className="space-y-2 mt-4">
              <Alert variant={analysisResult.shouldReply ? "default" : "destructive"}>
                <AlertDescription>
                  {analysisResult.shouldReply 
                    ? "✓ This text should receive a reply" 
                    : "✗ This text should not receive a reply"}
                </AlertDescription>
              </Alert>
              
              <div className="space-y-2 text-sm">
                <p>• Type: {analysisResult.type}</p>
                <p>• Intent: {analysisResult.intent}</p>
                <p>• Tone: {analysisResult.tone}</p>
                <p>• Engagement Value: {analysisResult.engagement_value}/10</p>
                {analysisResult.hasKeywords && (
                  <p>• Matched keywords: {analysisResult.matchedKeywords?.join(", ")}</p>
                )}
                {analysisResult.keywords?.length > 0 && (
                  <p>• Detected topics: {analysisResult.keywords.join(", ")}</p>
                )}
                <p>• Reason: {analysisResult.reason}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Settings Card */}
      <Card>
        <CardHeader>
          <CardTitle>Reply Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Reply Rules Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Reply Rules</h3>
            <div className="flex items-center justify-between">
              <span>Reply to questions</span>
              <Switch 
                checked={replySettings.replyToQuestions}
                onCheckedChange={() => handleSwitchChange('replyToQuestions')}
              />
            </div>

            <div className="flex items-center justify-between">
              <span>Reply to statements</span>
              <Switch 
                checked={replySettings.replyToStatements}
                onCheckedChange={() => handleSwitchChange('replyToStatements')}
              />
            </div>
          </div>

          {/* Keywords Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Priority Keywords</h3>
            <div className="flex space-x-2">
              <Input 
                placeholder="Add keyword"
                value={newKeyword}
                onChange={(e) => setNewKeyword(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addKeyword()}
              />
              <Button onClick={addKeyword} size="icon">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {replySettings.keywords.map((keyword, index) => (
                <div key={index} className="flex items-center bg-gray-100 rounded-full px-3 py-1">
                  <span>{keyword}</span>
                  <button
                    onClick={() => removeKeyword(index)}
                    className="ml-2 text-gray-500 hover:text-gray-700"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Blocked Terms Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Blocked Terms</h3>
            <div className="flex space-x-2">
              <Input 
                placeholder="Add blocked term"
                value={newBlockedTerm}
                onChange={(e) => setNewBlockedTerm(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addBlockedTerm()}
              />
              <Button onClick={addBlockedTerm} size="icon">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {replySettings.blockedTerms.map((term, index) => (
                <div key={index} className="flex items-center bg-red-100 rounded-full px-3 py-1">
                  <span>{term}</span>
                  <button
                    onClick={() => removeBlockedTerm(index)}
                    className="ml-2 text-gray-500 hover:text-gray-700"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ReplyAnalyzer;