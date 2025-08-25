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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";
import { User, Save, Plus, X } from "lucide-react";

interface StudentProfile {
  id: string;
  userId: string;
  gpa: string;
  major: string;
  academicLevel: string;
  graduationYear: number;
  school: string;
  location: string;
  demographics: any;
  interests: string[];
  extracurriculars: string[];
  achievements: string[];
  financialNeed: boolean;
  completionPercentage: number;
}

export default function Profile() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState<Partial<StudentProfile>>({
    gpa: '',
    major: '',
    academicLevel: '',
    graduationYear: new Date().getFullYear(),
    school: '',
    location: '',
    demographics: {},
    interests: [],
    extracurriculars: [],
    achievements: [],
    financialNeed: false,
  });

  const [newInterest, setNewInterest] = useState('');
  const [newActivity, setNewActivity] = useState('');
  const [newAchievement, setNewAchievement] = useState('');

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      const redirectTimeout = setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      
      return () => {
        clearTimeout(redirectTimeout);
      };
    }
  }, [isAuthenticated, authLoading, toast]);

  // Fetch profile data
  const { data: profile, isLoading } = useQuery<StudentProfile>({
    queryKey: ["/api/profile"],
    retry: false,
  });

  // Update form data when profile loads
  useEffect(() => {
    if (profile) {
      setFormData({
        gpa: profile.gpa || '',
        major: profile.major || '',
        academicLevel: profile.academicLevel || '',
        graduationYear: profile.graduationYear || new Date().getFullYear(),
        school: profile.school || '',
        location: profile.location || '',
        demographics: profile.demographics || {},
        interests: profile.interests || [],
        extracurriculars: profile.extracurriculars || [],
        achievements: profile.achievements || [],
        financialNeed: profile.financialNeed || false,
      });
    }
  }, [profile]);

  // Save profile mutation
  const saveMutation = useMutation({
    mutationFn: async (data: Partial<StudentProfile>) => {
      return await apiRequest("POST", "/api/profile", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
      toast({
        title: "Success",
        description: "Profile updated successfully!",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error as Error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        // No cleanup needed for redirect timeout in error handler
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to save profile",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate(formData);
  };

  const addInterest = () => {
    if (newInterest.trim() && !formData.interests?.includes(newInterest.trim())) {
      setFormData(prev => ({
        ...prev,
        interests: [...(prev.interests || []), newInterest.trim()]
      }));
      setNewInterest('');
    }
  };

  const removeInterest = (interest: string) => {
    setFormData(prev => ({
      ...prev,
      interests: prev.interests?.filter(i => i !== interest) || []
    }));
  };

  const addActivity = () => {
    if (newActivity.trim() && !formData.extracurriculars?.includes(newActivity.trim())) {
      setFormData(prev => ({
        ...prev,
        extracurriculars: [...(prev.extracurriculars || []), newActivity.trim()]
      }));
      setNewActivity('');
    }
  };

  const removeActivity = (activity: string) => {
    setFormData(prev => ({
      ...prev,
      extracurriculars: prev.extracurriculars?.filter(a => a !== activity) || []
    }));
  };

  const addAchievement = () => {
    if (newAchievement.trim() && !formData.achievements?.includes(newAchievement.trim())) {
      setFormData(prev => ({
        ...prev,
        achievements: [...(prev.achievements || []), newAchievement.trim()]
      }));
      setNewAchievement('');
    }
  };

  const removeAchievement = (achievement: string) => {
    setFormData(prev => ({
      ...prev,
      achievements: prev.achievements?.filter(a => a !== achievement) || []
    }));
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-background-gray">
        <Navigation />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            <div className="space-y-4">
              <div className="h-32 bg-gray-200 rounded"></div>
              <div className="h-32 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background-gray">
      <Navigation />
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-20 md:pb-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2" data-testid="text-profile-title">
            Student Profile
          </h1>
          <p className="text-gray-600">
            Keep your information current to get the best scholarship matches.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Academic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <User className="w-5 h-5" />
                <span>Academic Information</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="gpa">GPA</Label>
                  <Input
                    id="gpa"
                    type="number"
                    step="0.01"
                    min="0"
                    max="4.0"
                    value={formData.gpa}
                    onChange={(e) => setFormData(prev => ({ ...prev, gpa: e.target.value }))}
                    placeholder="3.75"
                    data-testid="input-gpa"
                  />
                </div>
                
                <div>
                  <Label htmlFor="academicLevel">Academic Level</Label>
                  <Select 
                    value={formData.academicLevel} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, academicLevel: value }))}
                  >
                    <SelectTrigger data-testid="select-academic-level">
                      <SelectValue placeholder="Select level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="freshman">Freshman</SelectItem>
                      <SelectItem value="sophomore">Sophomore</SelectItem>
                      <SelectItem value="junior">Junior</SelectItem>
                      <SelectItem value="senior">Senior</SelectItem>
                      <SelectItem value="graduate">Graduate</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="major">Major</Label>
                  <Input
                    id="major"
                    value={formData.major}
                    onChange={(e) => setFormData(prev => ({ ...prev, major: e.target.value }))}
                    placeholder="Computer Science"
                    data-testid="input-major"
                  />
                </div>

                <div>
                  <Label htmlFor="graduationYear">Graduation Year</Label>
                  <Input
                    id="graduationYear"
                    type="number"
                    min="2024"
                    max="2030"
                    value={formData.graduationYear}
                    onChange={(e) => setFormData(prev => ({ ...prev, graduationYear: parseInt(e.target.value) }))}
                    data-testid="input-graduation-year"
                  />
                </div>

                <div className="md:col-span-2">
                  <Label htmlFor="school">School/University</Label>
                  <Input
                    id="school"
                    value={formData.school}
                    onChange={(e) => setFormData(prev => ({ ...prev, school: e.target.value }))}
                    placeholder="University of California, Berkeley"
                    data-testid="input-school"
                  />
                </div>

                <div className="md:col-span-2">
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    value={formData.location}
                    onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                    placeholder="San Francisco, CA"
                    data-testid="input-location"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Interests */}
          <Card>
            <CardHeader>
              <CardTitle>Academic Interests</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {formData.interests?.map((interest, index) => (
                  <Badge key={index} variant="secondary" className="flex items-center space-x-1">
                    <span>{interest}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeInterest(interest)}
                      className="h-4 w-4 p-0 hover:bg-transparent"
                      data-testid={`button-remove-interest-${index}`}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                ))}
              </div>
              <div className="flex space-x-2">
                <Input
                  value={newInterest}
                  onChange={(e) => setNewInterest(e.target.value)}
                  placeholder="Add an interest (e.g., Environmental Science)"
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addInterest())}
                  data-testid="input-new-interest"
                />
                <Button type="button" onClick={addInterest} data-testid="button-add-interest">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Extracurriculars */}
          <Card>
            <CardHeader>
              <CardTitle>Extracurricular Activities</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {formData.extracurriculars?.map((activity, index) => (
                  <Badge key={index} variant="secondary" className="flex items-center space-x-1">
                    <span>{activity}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeActivity(activity)}
                      className="h-4 w-4 p-0 hover:bg-transparent"
                      data-testid={`button-remove-activity-${index}`}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                ))}
              </div>
              <div className="flex space-x-2">
                <Input
                  value={newActivity}
                  onChange={(e) => setNewActivity(e.target.value)}
                  placeholder="Add an activity (e.g., Student Government)"
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addActivity())}
                  data-testid="input-new-activity"
                />
                <Button type="button" onClick={addActivity} data-testid="button-add-activity">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Achievements */}
          <Card>
            <CardHeader>
              <CardTitle>Achievements & Awards</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {formData.achievements?.map((achievement, index) => (
                  <Badge key={index} variant="secondary" className="flex items-center space-x-1">
                    <span>{achievement}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeAchievement(achievement)}
                      className="h-4 w-4 p-0 hover:bg-transparent"
                      data-testid={`button-remove-achievement-${index}`}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                ))}
              </div>
              <div className="flex space-x-2">
                <Input
                  value={newAchievement}
                  onChange={(e) => setNewAchievement(e.target.value)}
                  placeholder="Add an achievement (e.g., Dean's List)"
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addAchievement())}
                  data-testid="input-new-achievement"
                />
                <Button type="button" onClick={addAchievement} data-testid="button-add-achievement">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Financial Information */}
          <Card>
            <CardHeader>
              <CardTitle>Financial Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="financialNeed"
                  checked={formData.financialNeed}
                  onCheckedChange={(checked) => 
                    setFormData(prev => ({ ...prev, financialNeed: checked as boolean }))
                  }
                  data-testid="checkbox-financial-need"
                />
                <Label htmlFor="financialNeed">
                  I have demonstrated financial need
                </Label>
              </div>
            </CardContent>
          </Card>

          {/* Save Button */}
          <div className="flex justify-end">
            <Button 
              type="submit" 
              disabled={saveMutation.isPending}
              className="bg-primary hover:bg-blue-700 flex items-center space-x-2"
              data-testid="button-save-profile"
            >
              <Save className="w-4 h-4" />
              <span>{saveMutation.isPending ? 'Saving...' : 'Save Profile'}</span>
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
