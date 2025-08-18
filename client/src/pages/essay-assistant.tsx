import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Navigation } from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";
import { 
  PenTool, 
  Plus, 
  FileText, 
  Lightbulb, 
  CheckCircle,
  Clock,
  Edit,
  Trash2,
  BookOpen,
  Target
} from "lucide-react";

interface Essay {
  id: string;
  studentId: string;
  title: string;
  prompt: string;
  content: string;
  outline: any;
  feedback: string[];
  wordCount: number;
  createdAt: string;
  updatedAt: string;
}

const ESSAY_PROMPTS = [
  {
    category: "Personal Statement",
    prompts: [
      "Describe a challenge you've overcome and how it shaped you as a person.",
      "Tell us about a time when you demonstrated leadership in your community.",
      "What are your career goals and how will this scholarship help you achieve them?",
      "Describe a person who has significantly influenced your life and explain why.",
    ]
  },
  {
    category: "Academic Goals",
    prompts: [
      "Explain why you chose your field of study and your future plans in this area.",
      "Describe a research project or academic experience that sparked your interest.",
      "How do you plan to use your education to make a positive impact?",
      "What unique perspective will you bring to your field of study?",
    ]
  },
  {
    category: "Community Service",
    prompts: [
      "Describe your most meaningful volunteer experience.",
      "How have you contributed to your community and what did you learn?",
      "Explain a social issue you're passionate about and how you've addressed it.",
      "Describe how you plan to give back to your community in the future.",
    ]
  },
];

const SAMPLE_OUTLINES = {
  personal_challenge: {
    title: "Overcoming Academic Challenges",
    sections: [
      {
        title: "Introduction",
        content: "Hook: Start with a compelling moment from your challenge",
        tips: ["Use vivid imagery", "Make it relatable", "Hint at the transformation"]
      },
      {
        title: "The Challenge",
        content: "Describe the specific difficulty you faced",
        tips: ["Be specific but not overly detailed", "Focus on your emotions", "Show the stakes involved"]
      },
      {
        title: "Actions Taken",
        content: "Explain the steps you took to address the challenge",
        tips: ["Show your problem-solving skills", "Highlight your determination", "Include setbacks and learning"]
      },
      {
        title: "Growth & Learning",
        content: "Reflect on how this experience changed you",
        tips: ["Connect to personal development", "Show increased resilience", "Demonstrate new skills gained"]
      },
      {
        title: "Future Application",
        content: "Explain how this experience will help you in the future",
        tips: ["Connect to your goals", "Show ongoing relevance", "Demonstrate maturity"]
      }
    ]
  },
  leadership: {
    title: "Leadership Experience",
    sections: [
      {
        title: "Setting the Scene",
        content: "Describe the situation that required leadership",
        tips: ["Provide context", "Explain why leadership was needed", "Set up the stakes"]
      },
      {
        title: "Taking Initiative",
        content: "Explain how you stepped up to lead",
        tips: ["Show your decision-making process", "Highlight your motivation", "Describe your initial actions"]
      },
      {
        title: "Leading Others",
        content: "Describe how you worked with and motivated your team",
        tips: ["Show collaboration skills", "Highlight communication", "Demonstrate empathy"]
      },
      {
        title: "Overcoming Obstacles",
        content: "Discuss challenges you faced as a leader and how you handled them",
        tips: ["Show adaptability", "Demonstrate problem-solving", "Highlight learning from mistakes"]
      },
      {
        title: "Results & Reflection",
        content: "Share the outcomes and what you learned about leadership",
        tips: ["Quantify results when possible", "Reflect on leadership growth", "Connect to future leadership opportunities"]
      }
    ]
  }
};

export default function EssayAssistant() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [newEssayDialogOpen, setNewEssayDialogOpen] = useState(false);
  const [selectedEssayId, setSelectedEssayId] = useState<string | null>(null);
  const [newEssayForm, setNewEssayForm] = useState({
    title: "",
    prompt: "",
  });
  const [essayIdeas, setEssayIdeas] = useState<string[]>([]);

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

  // Fetch essays
  const { data: essays, isLoading } = useQuery<Essay[]>({
    queryKey: ["/api/essays"],
    retry: false,
  });

  // Fetch selected essay details
  const { data: selectedEssay, isLoading: selectedEssayLoading } = useQuery<Essay>({
    queryKey: ["/api/essays", selectedEssayId],
    enabled: !!selectedEssayId,
    retry: false,
  });

  // Create essay mutation
  const createEssayMutation = useMutation({
    mutationFn: async (essayData: {
      title: string;
      prompt: string;
      content?: string;
      outline?: any;
    }) => {
      return await apiRequest("POST", "/api/essays", essayData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/essays"] });
      setNewEssayDialogOpen(false);
      setNewEssayForm({ title: "", prompt: "" });
      toast({
        title: "Success",
        description: "Essay created successfully!",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error as Error)) {
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
        description: "Failed to create essay",
        variant: "destructive",
      });
    },
  });

  // Update essay mutation
  const updateEssayMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Essay> }) => {
      return await apiRequest("PUT", `/api/essays/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/essays"] });
      queryClient.invalidateQueries({ queryKey: ["/api/essays", selectedEssayId] });
      toast({
        title: "Success",
        description: "Essay updated successfully!",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error as Error)) {
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
        description: "Failed to update essay",
        variant: "destructive",
      });
    },
  });

  // Delete essay mutation
  const deleteEssayMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/essays/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/essays"] });
      if (selectedEssayId) {
        setSelectedEssayId(null);
      }
      toast({
        title: "Success",
        description: "Essay deleted successfully",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error as Error)) {
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
        description: "Failed to delete essay",
        variant: "destructive",
      });
    },
  });

  // AI-powered mutations
  const analyzeEssayMutation = useMutation({
    mutationFn: async (essayId: string) => {
      const response = await apiRequest("POST", `/api/essays/${essayId}/analyze`);
      return response.json();
    },
    onSuccess: (feedback) => {
      if (selectedEssay) {
        const newFeedback = [...(selectedEssay.feedback || []), 
          `AI Analysis Score: ${feedback.overallScore}/10`,
          `Strengths: ${feedback.strengths.join(', ')}`,
          `Improvements: ${feedback.improvements.join(', ')}`,
          `Suggestions: ${feedback.suggestions}`
        ];
        updateEssayMutation.mutate({
          id: selectedEssay.id,
          data: { feedback: newFeedback }
        });
      }
      toast({
        title: "AI Analysis Complete",
        description: `Essay scored ${feedback.overallScore}/10`,
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error as Error)) {
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
        description: "Failed to analyze essay",
        variant: "destructive",
      });
    },
  });

  const generateOutlineMutation = useMutation({
    mutationFn: async ({ prompt, essayType }: { prompt: string; essayType: string }) => {
      const response = await apiRequest("POST", "/api/essays/generate-outline", {
        prompt,
        essayType
      });
      return response.json();
    },
    onSuccess: (outline) => {
      if (selectedEssay) {
        updateEssayMutation.mutate({
          id: selectedEssay.id,
          data: { outline }
        });
      }
      toast({
        title: "AI Outline Generated",
        description: "Smart outline created based on your prompt",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error as Error)) {
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
        description: "Failed to generate outline",
        variant: "destructive",
      });
    },
  });

  const generateIdeasMutation = useMutation({
    mutationFn: async (essayType: string) => {
      const response = await apiRequest("POST", "/api/essays/generate-ideas", {
        essayType
      });
      return response.json();
    },
    onSuccess: (data) => {
      setEssayIdeas(data.ideas);
      toast({
        title: "AI Ideas Generated",
        description: `Generated ${data.ideas.length} personalized essay ideas`,
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error as Error)) {
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
        description: "Failed to generate ideas",
        variant: "destructive",
      });
    },
  });

  const handleCreateEssay = () => {
    if (!newEssayForm.title || !newEssayForm.prompt) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    createEssayMutation.mutate({
      title: newEssayForm.title,
      prompt: newEssayForm.prompt,
      content: "",
      outline: null,
    });
  };

  const generateOutline = (essayType: keyof typeof SAMPLE_OUTLINES) => {
    const outline = SAMPLE_OUTLINES[essayType];
    if (selectedEssay) {
      updateEssayMutation.mutate({
        id: selectedEssay.id,
        data: { outline }
      });
    }
  };

  const updateEssayContent = (content: string) => {
    const wordCount = content.trim().split(/\s+/).filter(word => word.length > 0).length;
    if (selectedEssay) {
      updateEssayMutation.mutate({
        id: selectedEssay.id,
        data: { content, wordCount }
      });
    }
  };

  const addFeedback = (feedback: string) => {
    if (selectedEssay && feedback.trim()) {
      const newFeedback = [...(selectedEssay.feedback || []), feedback.trim()];
      updateEssayMutation.mutate({
        id: selectedEssay.id,
        data: { feedback: newFeedback }
      });
    }
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this essay?")) {
      deleteEssayMutation.mutate(id);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background-gray">
        <Navigation />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-32 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background-gray">
      <Navigation />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-20 md:pb-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2" data-testid="text-essay-assistant-title">
              Essay Assistant
            </h1>
            <p className="text-gray-600">
              Get help with brainstorming, outlining, and writing your scholarship essays.
            </p>
          </div>
          
          <Dialog open={newEssayDialogOpen} onOpenChange={setNewEssayDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-blue-700" data-testid="button-new-essay">
                <Plus className="w-4 h-4 mr-2" />
                New Essay
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Start New Essay</DialogTitle>
              </DialogHeader>
              <div className="space-y-6">
                <div>
                  <Label htmlFor="essay-title">Essay Title</Label>
                  <Input
                    id="essay-title"
                    value={newEssayForm.title}
                    onChange={(e) => setNewEssayForm(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="e.g., Personal Statement for ABC Scholarship"
                    data-testid="input-essay-title"
                  />
                </div>
                
                <div>
                  <Label htmlFor="essay-prompt">Essay Prompt</Label>
                  <Textarea
                    id="essay-prompt"
                    value={newEssayForm.prompt}
                    onChange={(e) => setNewEssayForm(prev => ({ ...prev, prompt: e.target.value }))}
                    placeholder="Paste the essay prompt here..."
                    rows={4}
                    data-testid="textarea-essay-prompt"
                  />
                </div>

                {/* Sample Prompts */}
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-3 block">
                    Or choose from sample prompts:
                  </Label>
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {ESSAY_PROMPTS.map((category) => (
                      <div key={category.category}>
                        <h4 className="font-medium text-gray-900 mb-2">{category.category}</h4>
                        <div className="space-y-1">
                          {category.prompts.map((prompt, index) => (
                            <Button
                              key={index}
                              variant="ghost"
                              size="sm"
                              onClick={() => setNewEssayForm(prev => ({ ...prev, prompt }))}
                              className="w-full text-left p-2 h-auto text-sm text-gray-600 hover:text-gray-900"
                              data-testid={`button-sample-prompt-${index}`}
                            >
                              {prompt}
                            </Button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end space-x-2">
                  <Button
                    variant="outline"
                    onClick={() => setNewEssayDialogOpen(false)}
                    data-testid="button-cancel-essay"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleCreateEssay}
                    disabled={createEssayMutation.isPending || !newEssayForm.title || !newEssayForm.prompt}
                    data-testid="button-create-essay"
                  >
                    {createEssayMutation.isPending ? 'Creating...' : 'Create Essay'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Essays List Sidebar */}
          <div className="lg:col-span-1">
            <Card className="border border-gray-200 sticky top-20">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <FileText className="w-5 h-5" />
                  <span>Your Essays</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="animate-pulse">
                        <Skeleton className="h-16 w-full rounded" />
                      </div>
                    ))}
                  </div>
                ) : essays && essays.length > 0 ? (
                  <div className="space-y-2">
                    {essays.map((essay) => (
                      <Card 
                        key={essay.id} 
                        className={`cursor-pointer transition-colors ${
                          selectedEssayId === essay.id ? 'bg-blue-50 border-blue-200' : 'hover:bg-gray-50'
                        }`}
                        onClick={() => setSelectedEssayId(essay.id)}
                      >
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start mb-2">
                            <h4 className="font-medium text-gray-900 truncate flex-1" data-testid="text-essay-item-title">
                              {essay.title}
                            </h4>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(essay.id);
                              }}
                              className="p-1 h-6 w-6 text-gray-400 hover:text-red-600"
                              data-testid="button-delete-essay-item"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                          <div className="flex items-center justify-between text-xs text-gray-500">
                            <span>{essay.wordCount} words</span>
                            <span>{new Date(essay.updatedAt).toLocaleDateString()}</span>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <PenTool className="mx-auto h-8 w-8 text-gray-300 mb-3" />
                    <p className="text-sm">No essays yet</p>
                    <p className="text-xs">Create your first essay to get started</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Main Content Area */}
          <div className="lg:col-span-2">
            {selectedEssayId ? (
              selectedEssayLoading ? (
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <Skeleton className="h-6 w-3/4" />
                    </CardHeader>
                    <CardContent>
                      <Skeleton className="h-32 w-full" />
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-6">
                      <Skeleton className="h-64 w-full" />
                    </CardContent>
                  </Card>
                </div>
              ) : selectedEssay ? (
                <div className="space-y-6">
                  {/* Essay Header */}
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle data-testid="text-selected-essay-title">
                          {selectedEssay.title}
                        </CardTitle>
                        <div className="flex items-center space-x-2">
                          <Badge variant="outline" data-testid="text-word-count">
                            {selectedEssay.wordCount} words
                          </Badge>
                          <Badge variant="secondary">
                            <Clock className="w-3 h-3 mr-1" />
                            {new Date(selectedEssay.updatedAt).toLocaleDateString()}
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div>
                        <h4 className="font-medium text-gray-900 mb-2">Essay Prompt:</h4>
                        <p className="text-gray-700 bg-gray-50 p-3 rounded" data-testid="text-essay-prompt">
                          {selectedEssay.prompt}
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Writing Tools */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <Lightbulb className="w-5 h-5" />
                        <span>AI Writing Assistant</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Button
                          onClick={() => analyzeEssayMutation.mutate(selectedEssay.id)}
                          disabled={analyzeEssayMutation.isPending}
                          className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white"
                          data-testid="button-ai-analyze"
                        >
                          {analyzeEssayMutation.isPending ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          ) : (
                            <Target className="w-4 h-4 mr-2" />
                          )}
                          AI Essay Analysis
                        </Button>
                        <Button
                          onClick={() => generateOutlineMutation.mutate({
                            prompt: selectedEssay.prompt,
                            essayType: "scholarship"
                          })}
                          disabled={generateOutlineMutation.isPending}
                          className="bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 text-white"
                          data-testid="button-ai-outline"
                        >
                          {generateOutlineMutation.isPending ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          ) : (
                            <BookOpen className="w-4 h-4 mr-2" />
                          )}
                          AI Generate Outline
                        </Button>
                        <Button
                          onClick={() => generateIdeasMutation.mutate("scholarship")}
                          disabled={generateIdeasMutation.isPending}
                          className="bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white"
                          data-testid="button-ai-ideas"
                        >
                          {generateIdeasMutation.isPending ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          ) : (
                            <Lightbulb className="w-4 h-4 mr-2" />
                          )}
                          AI Essay Ideas
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => generateOutline('personal_challenge')}
                          disabled={updateEssayMutation.isPending}
                          data-testid="button-generate-personal-outline"
                        >
                          <Target className="w-4 h-4 mr-2" />
                          Template: Personal Challenge
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Outline Display */}
                  {selectedEssay.outline && (
                    <Card>
                      <CardHeader>
                        <CardTitle>Essay Outline</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <h3 className="font-semibold text-lg" data-testid="text-outline-title">
                            {selectedEssay.outline.title}
                          </h3>
                          <div className="space-y-4">
                            {selectedEssay.outline.sections?.map((section: any, index: number) => (
                              <div key={index} className="border-l-4 border-blue-200 pl-4">
                                <h4 className="font-medium text-gray-900 mb-1">
                                  {index + 1}. {section.title}
                                </h4>
                                <p className="text-gray-700 text-sm mb-2">{section.content}</p>
                                {section.tips && (
                                  <div className="space-y-1">
                                    {section.tips.map((tip: string, tipIndex: number) => (
                                      <p key={tipIndex} className="text-xs text-gray-600 bg-blue-50 px-2 py-1 rounded">
                                        💡 {tip}
                                      </p>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Essay Content Editor */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Essay Content</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Textarea
                        value={selectedEssay.content || ''}
                        onChange={(e) => updateEssayContent(e.target.value)}
                        placeholder="Start writing your essay here..."
                        rows={12}
                        className="w-full"
                        data-testid="textarea-essay-content"
                      />
                    </CardContent>
                  </Card>

                  {/* AI Essay Ideas */}
                  {essayIdeas.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center space-x-2">
                          <Lightbulb className="w-5 h-5 text-yellow-600" />
                          <span>AI-Generated Essay Ideas</span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {essayIdeas.map((idea, index) => (
                            <div key={index} className="bg-blue-50 border border-blue-200 rounded p-3">
                              <p className="text-sm text-gray-800" data-testid={`text-essay-idea-${index}`}>
                                💡 {idea}
                              </p>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Feedback Section */}
                  {selectedEssay.feedback && selectedEssay.feedback.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center space-x-2">
                          <CheckCircle className="w-5 h-5" />
                          <span>Feedback & AI Analysis</span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {selectedEssay.feedback.map((feedback, index) => (
                            <div key={index} className={`rounded p-3 ${
                              feedback.includes('AI Analysis') 
                                ? 'bg-purple-50 border border-purple-200' 
                                : 'bg-yellow-50 border border-yellow-200'
                            }`}>
                              <p className="text-sm text-gray-800" data-testid={`text-feedback-${index}`}>
                                {feedback.includes('AI Analysis') ? '🤖 ' : '📝 '}{feedback}
                              </p>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              ) : (
                <Card className="p-12">
                  <div className="text-center text-gray-500">
                    <FileText className="mx-auto h-12 w-12 text-gray-300 mb-4" />
                    <p>Essay not found</p>
                  </div>
                </Card>
              )
            ) : (
              <Card className="p-12">
                <div className="text-center">
                  <PenTool className="mx-auto h-12 w-12 text-gray-300 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Welcome to Essay Assistant
                  </h3>
                  <p className="text-gray-600 mb-6">
                    Select an essay from the sidebar or create a new one to get started with writing assistance.
                  </p>
                  <Button
                    onClick={() => setNewEssayDialogOpen(true)}
                    className="bg-primary hover:bg-blue-700"
                    data-testid="button-create-first-essay"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Create Your First Essay
                  </Button>
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
