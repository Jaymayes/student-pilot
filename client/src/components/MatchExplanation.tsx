import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  ChevronDown, 
  ChevronUp, 
  Target, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle,
  Info,
  Lightbulb
} from 'lucide-react';

interface MatchExplanation {
  primaryFactors: string[];
  strengthMatch: string[];
  weaknessAreas: string[];
  improvementSuggestions?: string[];
}

interface ConfidenceData {
  score: number;
  confidenceInterval: [number, number];
  historicalSuccessRate?: number;
  chanceLevel: 'High Chance' | 'Competitive' | 'Long Shot';
}

interface CompetitionData {
  estimatedApplicants: number;
  averageApplicantScore: number;
  studentPercentile: number;
}

interface MatchExplanationProps {
  scholarshipId: string;
  matchScore: number;
  explanation: MatchExplanation;
  confidence: ConfidenceData;
  competition?: CompetitionData;
  isExpanded?: boolean;
  onToggle?: (expanded: boolean) => void;
  onFeedback?: (rating: 'helpful' | 'not_helpful') => void;
}

/**
 * Comprehensive match explanation component
 * Shows detailed breakdown of scholarship matching factors
 */
export function MatchExplanation({
  scholarshipId,
  matchScore,
  explanation,
  confidence,
  competition,
  isExpanded = false,
  onToggle,
  onFeedback
}: MatchExplanationProps) {
  const [expanded, setExpanded] = useState(isExpanded);
  const [feedbackGiven, setFeedbackGiven] = useState(false);

  const handleToggle = () => {
    const newExpanded = !expanded;
    setExpanded(newExpanded);
    onToggle?.(newExpanded);
  };

  const handleFeedback = (rating: 'helpful' | 'not_helpful') => {
    onFeedback?.(rating);
    setFeedbackGiven(true);
  };

  const getChanceLevelColor = (level: string) => {
    switch (level) {
      case 'High Chance':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'Competitive':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'Long Shot':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const getMatchScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 dark:text-green-400';
    if (score >= 60) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  return (
    <Card className="w-full" data-testid={`match-explanation-${scholarshipId}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Match Analysis</CardTitle>
          <div className="flex items-center gap-3">
            <Badge className={getChanceLevelColor(confidence.chanceLevel)}>
              {confidence.chanceLevel}
            </Badge>
            <div className={`text-2xl font-bold ${getMatchScoreColor(matchScore)}`}>
              {matchScore}%
            </div>
          </div>
        </div>
        
        {/* Match Score Progress Bar */}
        <div className="space-y-2">
          <Progress 
            value={matchScore} 
            className="h-3"
            data-testid={`match-score-progress-${scholarshipId}`}
          />
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Match Score</span>
            <span>{matchScore}% ({confidence.confidenceInterval[0]}-{confidence.confidenceInterval[1]}%)</span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Quick Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-3 bg-muted/50 rounded-lg">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {explanation.strengthMatch.length}
            </div>
            <div className="text-sm text-muted-foreground">Strong Matches</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
              {explanation.weaknessAreas.length}
            </div>
            <div className="text-sm text-muted-foreground">Improvement Areas</div>
          </div>
          {competition && (
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {competition.studentPercentile}%
              </div>
              <div className="text-sm text-muted-foreground">Your Percentile</div>
            </div>
          )}
        </div>

        {/* Expandable Detailed Analysis */}
        <Collapsible open={expanded} onOpenChange={setExpanded}>
          <CollapsibleTrigger asChild>
            <Button 
              variant="ghost" 
              className="w-full justify-between"
              onClick={handleToggle}
              data-testid={`expand-explanation-${scholarshipId}`}
            >
              <span>Detailed Analysis</span>
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </CollapsibleTrigger>
          
          <CollapsibleContent className="space-y-4 mt-4">
            {/* Primary Factors */}
            <div>
              <h4 className="font-semibold flex items-center gap-2 mb-3">
                <Target className="h-4 w-4 text-blue-600" />
                Key Matching Factors
              </h4>
              <div className="space-y-2">
                {explanation.primaryFactors.map((factor, index) => (
                  <div key={index} className="flex items-start gap-2 p-2 bg-blue-50 dark:bg-blue-950/20 rounded">
                    <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                    <span className="text-sm">{factor}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Strengths */}
            <div>
              <h4 className="font-semibold flex items-center gap-2 mb-3">
                <CheckCircle className="h-4 w-4 text-green-600" />
                Your Strengths
              </h4>
              <div className="space-y-2">
                {explanation.strengthMatch.map((strength, index) => (
                  <div key={index} className="flex items-start gap-2 p-2 bg-green-50 dark:bg-green-950/20 rounded">
                    <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span className="text-sm">{strength}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Weaknesses */}
            {explanation.weaknessAreas.length > 0 && (
              <div>
                <h4 className="font-semibold flex items-center gap-2 mb-3">
                  <AlertTriangle className="h-4 w-4 text-yellow-600" />
                  Areas for Improvement
                </h4>
                <div className="space-y-2">
                  {explanation.weaknessAreas.map((weakness, index) => (
                    <div key={index} className="flex items-start gap-2 p-2 bg-yellow-50 dark:bg-yellow-950/20 rounded">
                      <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                      <span className="text-sm">{weakness}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Improvement Suggestions */}
            {explanation.improvementSuggestions && explanation.improvementSuggestions.length > 0 && (
              <div>
                <h4 className="font-semibold flex items-center gap-2 mb-3">
                  <Lightbulb className="h-4 w-4 text-purple-600" />
                  Improvement Suggestions
                </h4>
                <div className="space-y-2">
                  {explanation.improvementSuggestions.map((suggestion, index) => (
                    <div key={index} className="flex items-start gap-2 p-2 bg-purple-50 dark:bg-purple-950/20 rounded">
                      <Lightbulb className="h-4 w-4 text-purple-600 mt-0.5 flex-shrink-0" />
                      <span className="text-sm">{suggestion}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Competition Analysis */}
            {competition && (
              <div>
                <h4 className="font-semibold flex items-center gap-2 mb-3">
                  <TrendingUp className="h-4 w-4 text-blue-600" />
                  Competition Analysis
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-3 bg-muted/50 rounded">
                    <div className="text-sm text-muted-foreground">Estimated Applicants</div>
                    <div className="text-xl font-semibold">{competition.estimatedApplicants.toLocaleString()}</div>
                  </div>
                  <div className="p-3 bg-muted/50 rounded">
                    <div className="text-sm text-muted-foreground">Average Applicant Score</div>
                    <div className="text-xl font-semibold">{competition.averageApplicantScore}%</div>
                  </div>
                </div>
                <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-950/20 rounded">
                  <div className="text-sm">
                    <strong>Your Position:</strong> You score higher than {competition.studentPercentile}% of typical applicants for this scholarship.
                  </div>
                </div>
              </div>
            )}

            {/* Historical Success Rate */}
            {confidence.historicalSuccessRate && (
              <div className="p-3 bg-muted/50 rounded">
                <div className="text-sm text-muted-foreground mb-1">Historical Success Rate</div>
                <div className="flex items-center gap-2">
                  <Progress value={confidence.historicalSuccessRate * 100} className="flex-1 h-2" />
                  <span className="text-sm font-medium">
                    {Math.round(confidence.historicalSuccessRate * 100)}%
                  </span>
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  Based on similar student profiles who applied to this scholarship
                </div>
              </div>
            )}
          </CollapsibleContent>
        </Collapsible>

        {/* Feedback Section */}
        <div className="pt-3 border-t">
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Was this explanation helpful?
            </div>
            {!feedbackGiven ? (
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => handleFeedback('helpful')}
                  data-testid={`feedback-helpful-${scholarshipId}`}
                >
                  Yes
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => handleFeedback('not_helpful')}
                  data-testid={`feedback-not-helpful-${scholarshipId}`}
                >
                  No
                </Button>
              </div>
            ) : (
              <div className="text-sm text-green-600 dark:text-green-400">
                Thank you for your feedback!
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Compact match explanation for list views
 */
export function CompactMatchExplanation({
  scholarshipId,
  matchScore,
  chanceLevel,
  primaryFactors
}: {
  scholarshipId: string;
  matchScore: number;
  chanceLevel: string;
  primaryFactors: string[];
}) {
  const getChanceLevelColor = (level: string) => {
    switch (level) {
      case 'High Chance':
        return 'text-green-600 dark:text-green-400';
      case 'Competitive':
        return 'text-yellow-600 dark:text-yellow-400';
      case 'Long Shot':
        return 'text-red-600 dark:text-red-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  };

  return (
    <div className="space-y-2" data-testid={`compact-explanation-${scholarshipId}`}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Match: {matchScore}%</span>
        <span className={`text-sm font-medium ${getChanceLevelColor(chanceLevel)}`}>
          {chanceLevel}
        </span>
      </div>
      <Progress value={matchScore} className="h-2" />
      {primaryFactors.length > 0 && (
        <div className="text-xs text-muted-foreground">
          Key factors: {primaryFactors.slice(0, 2).join(', ')}
          {primaryFactors.length > 2 && ` +${primaryFactors.length - 2} more`}
        </div>
      )}
    </div>
  );
}