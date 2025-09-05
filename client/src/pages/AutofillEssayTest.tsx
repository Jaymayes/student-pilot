import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { apiRequest } from '@/lib/queryClient';
import { isUnauthorizedError } from '@/lib/authUtils';
import { 
  PenTool, 
  FileText, 
  Shield, 
  Eye,
  CheckCircle,
  AlertCircle,
  XCircle,
  Info,
  Lightbulb,
  Search,
  Target,
  Clock
} from 'lucide-react';

interface AutofillResult {
  fieldName: string;
  suggestedValue: string;
  confidence: number;
  source: 'profile' | 'ai_generated' | 'template';
  explanation: string;
  safetyFlags: string[];
  traceId: string;
}

interface EssayAnalysis {
  overallScore: number;
  strengths: string[];
  improvements: string[];
  suggestions: string;
  wordCount: number;
  integrityCheck: {
    isValid: boolean;
    score: number;
    flags: string[];
    explanation: string;
    recommendations: string[];
  };
  explanations: {
    scoringReasoning: string[];
    improvementJustification: string[];
    strengthsEvidence: string[];
  };
  traceId: string;
}

interface EssayImprovement {
  improvedContent: string;
  changes: {
    type: string;
    original: string;
    improved: string;
    explanation: string;
  }[];
  integrityCheck: {
    isValid: boolean;
    score: number;
    flags: string[];
    explanation: string;
  };
  explanation: string;
  traceId: string;
}

const SAMPLE_FORM_FIELDS = [
  'firstName', 'lastName', 'email', 'gpa', 'major', 'school', 'graduationYear',
  'activities', 'achievements', 'careerGoals', 'whyDeserveScholarship'
];

const SAMPLE_ESSAY_CONTENT = `I have always been passionate about computer science and helping others. In high school, I started a coding club that taught basic programming to over 50 students. This experience taught me the importance of sharing knowledge and making technology accessible.

My academic journey has been focused on artificial intelligence and machine learning. I maintain a 3.8 GPA while working part-time to support my family. Despite financial challenges, I have completed several personal projects including a web application that helps local businesses manage inventory.

With this scholarship, I would be able to focus more on my studies and research. My goal is to work in the tech industry developing AI solutions that can help underserved communities access better healthcare and education resources.`;

export default function AutofillEssayTest() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  
  // State for autofill testing
  const [selectedFields, setSelectedFields] = useState<string[]>(['firstName', 'lastName', 'email', 'careerGoals']);
  const [autofillResults, setAutofillResults] = useState<AutofillResult[]>([]);
  const [selectedResult, setSelectedResult] = useState<AutofillResult | null>(null);

  // State for essay testing
  const [essayContent, setEssayContent] = useState(SAMPLE_ESSAY_CONTENT);
  const [essayPrompt, setEssayPrompt] = useState("Explain why you deserve this scholarship and how it will help you achieve your career goals.");
  const [essayAnalysis, setEssayAnalysis] = useState<EssayAnalysis | null>(null);
  const [essayImprovement, setEssayImprovement] = useState<EssayImprovement | null>(null);
  const [focusArea, setFocusArea] = useState('overall');

  // State for explainability
  const [showExplanation, setShowExplanation] = useState<string | null>(null);
  const [explanationData, setExplanationData] = useState<any>(null);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, authLoading, toast]);

  // Autofill test mutation
  const autofillMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/applications/autofill', {
        studentId: user?.id || 'test-student',
        scholarshipId: 'test-scholarship',
        formFields: selectedFields
      });
      return response.json();
    },
    onSuccess: (data) => {
      setAutofillResults(data.results || []);
      toast({
        title: "Autofill Test Complete",
        description: `Generated ${data.results?.length || 0} suggestions with safety checking`,
      });
    },
    onError: (error: any) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: error.message || "Failed to generate autofill suggestions",
        variant: "destructive",
      });
    },
  });

  // Essay analysis mutation
  const analyzeEssayMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/essays/analyze-safe', {
        content: essayContent,
        prompt: essayPrompt
      });
      return response.json();
    },
    onSuccess: (data) => {
      setEssayAnalysis(data.analysis);
      toast({
        title: "Essay Analysis Complete", 
        description: `Integrity Score: ${data.analysis?.integrityCheck?.score}/100`,
      });
    },
    onError: (error: any) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized", 
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: error.message || "Failed to analyze essay",
        variant: "destructive",
      });
    },
  });

  // Essay improvement mutation
  const improveEssayMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/essays/improve-safe', {
        content: essayContent,
        focusArea
      });
      return response.json();
    },
    onSuccess: (data) => {
      setEssayImprovement(data.improvement);
      toast({
        title: "Essay Improvement Complete",
        description: `${data.improvement?.changes?.length || 0} improvements with integrity preserved`,
      });
    },
    onError: (error: any) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: error.message || "Failed to improve essay",
        variant: "destructive",
      });
    },
  });

  // Get explanation for a suggestion
  const getExplanation = async (traceId: string, service: 'autofill' | 'essay') => {
    try {
      const endpoint = service === 'autofill' 
        ? `/api/applications/autofill/explain/${traceId}`
        : `/api/essays/explain/${traceId}`;

      const response = await apiRequest('GET', endpoint);
      const data = await response.json();
      
      setExplanationData(data.explanation);
      setShowExplanation(traceId);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to get explanation",
        variant: "destructive",
      });
    }
  };

  if (authLoading || !isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-[400px]" data-testid="loading-spinner">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2" data-testid="page-title">
            <Shield className="h-8 w-8 text-primary" />
            Application Autofill & Essay Safety Test
          </h1>
          <p className="text-muted-foreground">
            Test intelligent autofill and essay assistance with academic integrity safeguards
          </p>
        </div>
      </div>

      <Tabs defaultValue="autofill" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="autofill">Application Autofill</TabsTrigger>
          <TabsTrigger value="essay">Essay Assistance</TabsTrigger>
          <TabsTrigger value="audit">Audit Trail</TabsTrigger>
        </TabsList>

        <TabsContent value="autofill" className="space-y-6">
          <Card data-testid="card-autofill-test">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Intelligent Application Autofill Test
              </CardTitle>
              <CardDescription>
                Test structured form autofill with safety checks and explainable suggestions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Select Form Fields to Autofill</Label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
                  {SAMPLE_FORM_FIELDS.map((field) => (
                    <label key={field} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={selectedFields.includes(field)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedFields([...selectedFields, field]);
                          } else {
                            setSelectedFields(selectedFields.filter(f => f !== field));
                          }
                        }}
                        data-testid={`checkbox-field-${field}`}
                      />
                      <span className="text-sm">{field}</span>
                    </label>
                  ))}
                </div>
              </div>

              <Button 
                onClick={() => autofillMutation.mutate()}
                disabled={autofillMutation.isPending || selectedFields.length === 0}
                data-testid="button-run-autofill"
              >
                {autofillMutation.isPending ? 'Generating...' : 'Run Autofill Test'}
              </Button>

              {autofillResults.length > 0 && (
                <div className="space-y-4">
                  <h4 className="font-medium">Autofill Results</h4>
                  {autofillResults.map((result, index) => (
                    <Card key={result.traceId} data-testid={`autofill-result-${index}`}>
                      <CardContent className="pt-4">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h5 className="font-medium" data-testid={`result-field-${index}`}>
                              {result.fieldName}
                            </h5>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" data-testid={`result-source-${index}`}>
                                {result.source}
                              </Badge>
                              <Progress 
                                value={result.confidence * 100} 
                                className="w-20"
                                data-testid={`result-confidence-${index}`}
                              />
                              <span className="text-sm text-muted-foreground">
                                {(result.confidence * 100).toFixed(0)}%
                              </span>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => getExplanation(result.traceId, 'autofill')}
                              data-testid={`button-explain-${index}`}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Textarea 
                            value={result.suggestedValue} 
                            readOnly 
                            className="min-h-[60px]"
                            data-testid={`result-content-${index}`}
                          />
                          <p className="text-sm text-muted-foreground" data-testid={`result-explanation-${index}`}>
                            {result.explanation}
                          </p>
                          
                          {result.safetyFlags.length > 0 && (
                            <Alert data-testid={`result-safety-flags-${index}`}>
                              <AlertCircle className="h-4 w-4" />
                              <AlertDescription>
                                Safety flags: {result.safetyFlags.join(', ')}
                              </AlertDescription>
                            </Alert>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="essay" className="space-y-6">
          <Card data-testid="card-essay-test">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PenTool className="h-5 w-5" />
                Enhanced Essay Assistance Test
              </CardTitle>
              <CardDescription>
                Test essay analysis and improvement with academic integrity safeguards
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Essay Prompt</Label>
                <Textarea
                  value={essayPrompt}
                  onChange={(e) => setEssayPrompt(e.target.value)}
                  placeholder="Enter essay prompt..."
                  data-testid="input-essay-prompt"
                />
              </div>

              <div className="space-y-2">
                <Label>Essay Content</Label>
                <Textarea
                  value={essayContent}
                  onChange={(e) => setEssayContent(e.target.value)}
                  placeholder="Enter essay content..."
                  className="min-h-[200px]"
                  data-testid="input-essay-content"
                />
              </div>

              <div className="flex gap-4">
                <Button 
                  onClick={() => analyzeEssayMutation.mutate()}
                  disabled={analyzeEssayMutation.isPending || !essayContent.trim()}
                  data-testid="button-analyze-essay"
                >
                  {analyzeEssayMutation.isPending ? 'Analyzing...' : 'Analyze Essay'}
                </Button>

                <div className="flex items-center gap-2">
                  <Label>Focus Area:</Label>
                  <Select value={focusArea} onValueChange={setFocusArea}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="overall">Overall</SelectItem>
                      <SelectItem value="grammar">Grammar</SelectItem>
                      <SelectItem value="structure">Structure</SelectItem>
                      <SelectItem value="clarity">Clarity</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button 
                  onClick={() => improveEssayMutation.mutate()}
                  disabled={improveEssayMutation.isPending || !essayContent.trim()}
                  variant="outline"
                  data-testid="button-improve-essay"
                >
                  {improveEssayMutation.isPending ? 'Improving...' : 'Improve Essay'}
                </Button>
              </div>

              {essayAnalysis && (
                <Card data-testid="card-essay-analysis">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      Essay Analysis Results
                      <div className="flex items-center gap-2">
                        <Badge 
                          variant={essayAnalysis.integrityCheck.score >= 80 ? "default" : 
                                 essayAnalysis.integrityCheck.score >= 60 ? "secondary" : "destructive"}
                          data-testid="analysis-integrity-score"
                        >
                          Integrity: {essayAnalysis.integrityCheck.score}/100
                        </Badge>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => getExplanation(essayAnalysis.traceId, 'essay')}
                          data-testid="button-explain-analysis"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div data-testid="analysis-score">
                        <Label>Overall Score</Label>
                        <div className="text-2xl font-bold">{essayAnalysis.overallScore}/10</div>
                      </div>
                      <div data-testid="analysis-word-count">
                        <Label>Word Count</Label>
                        <div className="text-2xl font-bold">{essayAnalysis.wordCount}</div>
                      </div>
                      <div data-testid="analysis-flags">
                        <Label>Safety Flags</Label>
                        <div className="text-2xl font-bold">
                          {essayAnalysis.integrityCheck.flags.length}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label>Strengths</Label>
                        <ul className="list-disc list-inside space-y-1 text-sm" data-testid="analysis-strengths">
                          {essayAnalysis.strengths.map((strength, index) => (
                            <li key={index}>{strength}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <Label>Areas for Improvement</Label>
                        <ul className="list-disc list-inside space-y-1 text-sm" data-testid="analysis-improvements">
                          {essayAnalysis.improvements.map((improvement, index) => (
                            <li key={index}>{improvement}</li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    <div>
                      <Label>Detailed Suggestions</Label>
                      <p className="text-sm mt-1" data-testid="analysis-suggestions">
                        {essayAnalysis.suggestions}
                      </p>
                    </div>

                    {essayAnalysis.integrityCheck.flags.length > 0 && (
                      <Alert data-testid="analysis-safety-alert">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          <strong>Academic Integrity Concerns:</strong> {essayAnalysis.integrityCheck.explanation}
                        </AlertDescription>
                      </Alert>
                    )}
                  </CardContent>
                </Card>
              )}

              {essayImprovement && (
                <Card data-testid="card-essay-improvement">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      Essay Improvement Results
                      <div className="flex items-center gap-2">
                        <Badge 
                          variant={essayImprovement.integrityCheck.score >= 80 ? "default" : 
                                 essayImprovement.integrityCheck.score >= 60 ? "secondary" : "destructive"}
                          data-testid="improvement-integrity-score"
                        >
                          Integrity: {essayImprovement.integrityCheck.score}/100
                        </Badge>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => getExplanation(essayImprovement.traceId, 'essay')}
                          data-testid="button-explain-improvement"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label>Improved Content</Label>
                      <Textarea 
                        value={essayImprovement.improvedContent} 
                        readOnly 
                        className="min-h-[200px]"
                        data-testid="improvement-content"
                      />
                    </div>

                    <div>
                      <Label>Changes Made ({essayImprovement.changes.length})</Label>
                      <div className="space-y-2 mt-2">
                        {essayImprovement.changes.map((change, index) => (
                          <Card key={index} data-testid={`change-${index}`}>
                            <CardContent className="pt-3">
                              <div className="flex items-center justify-between mb-2">
                                <Badge variant="outline">{change.type}</Badge>
                                <small className="text-muted-foreground">{change.explanation}</small>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                                <div>
                                  <Label>Original:</Label>
                                  <p className="bg-red-50 p-2 rounded">{change.original}</p>
                                </div>
                                <div>
                                  <Label>Improved:</Label>
                                  <p className="bg-green-50 p-2 rounded">{change.improved}</p>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audit">
          <Card data-testid="card-audit-trail">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5" />
                Audit Trail & Explainability
              </CardTitle>
              <CardDescription>
                Traceable suggestions and safety validation history
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Alert data-testid="audit-info">
                <Info className="h-4 w-4" />
                <AlertDescription>
                  All autofill and essay assistance suggestions are logged with full traceability.
                  Click the explain button (👁) on any suggestion to see detailed reasoning and safety checks.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Explanation Dialog */}
      <Dialog open={!!showExplanation} onOpenChange={() => setShowExplanation(null)}>
        <DialogContent className="max-w-2xl" data-testid="dialog-explanation">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5" />
              Suggestion Explanation
            </DialogTitle>
          </DialogHeader>
          
          {explanationData && (
            <div className="space-y-4">
              <div>
                <Label>Explanation</Label>
                <p className="text-sm mt-1" data-testid="explanation-text">
                  {explanationData.explanation || explanationData.integrityAnalysis}
                </p>
              </div>
              
              {explanationData.reasoning && (
                <div>
                  <Label>Reasoning</Label>
                  <ul className="list-disc list-inside text-sm space-y-1 mt-1" data-testid="explanation-reasoning">
                    {explanationData.reasoning.map((reason: string, index: number) => (
                      <li key={index}>{reason}</li>
                    ))}
                  </ul>
                </div>
              )}

              {explanationData.safetyMeasures && (
                <div>
                  <Label>Safety Measures</Label>
                  <ul className="list-disc list-inside text-sm space-y-1 mt-1" data-testid="explanation-safety">
                    {explanationData.safetyMeasures.map((measure: string, index: number) => (
                      <li key={index}>{measure}</li>
                    ))}
                  </ul>
                </div>
              )}

              {explanationData.recommendations && (
                <div>
                  <Label>Recommendations</Label>
                  <ul className="list-disc list-inside text-sm space-y-1 mt-1" data-testid="explanation-recommendations">
                    {explanationData.recommendations.map((rec: string, index: number) => (
                      <li key={index}>{rec}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              <div className="flex items-center gap-2 p-3 bg-green-50 rounded">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm text-green-700">
                  All suggestions are traceable and include academic integrity validation
                </span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}