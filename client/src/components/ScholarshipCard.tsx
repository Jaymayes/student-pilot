import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bookmark, X, Calendar, Users } from "lucide-react";
interface ScholarshipCardProps {
  match: {
    id: string;
    studentId: string;
    scholarshipId: string;
    matchScore: number | null;
    matchReason: string[] | null;
    chanceLevel: string | null;
    isBookmarked: boolean | null;
    isDismissed: boolean | null;
    createdAt: string; // ISO string format
    scholarship: {
      id: string;
      title: string;
      organization: string;
      amount: number;
      description?: string;
      deadline: string; // ISO string format
      estimatedApplicants?: number;
    };
  };
  onBookmark: (id: string, bookmarked: boolean) => void;
  onDismiss: (id: string) => void;
}

export function ScholarshipCard({ match, onBookmark, onDismiss }: ScholarshipCardProps) {
  const { scholarship } = match;
  
  const getChanceBadgeClass = (chanceLevel: string) => {
    switch (chanceLevel?.toLowerCase()) {
      case 'high chance':
        return 'chance-high';
      case 'competitive':
        return 'chance-competitive';
      case 'long shot':
        return 'chance-long-shot';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDeadline = (deadline: string | Date) => {
    const date = new Date(deadline);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  const getDaysUntilDeadline = (deadline: string | Date) => {
    const deadlineDate = new Date(deadline);
    const now = new Date();
    const diffTime = deadlineDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const daysUntilDeadline = getDaysUntilDeadline(scholarship.deadline);

  return (
    <div 
      className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
      data-testid={`scholarship-card-${scholarship.id}`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-2">
            <h3 className="font-medium text-gray-900" data-testid="text-scholarship-title">
              {scholarship.title}
            </h3>
            <Badge 
              className={`text-xs font-medium rounded ${getChanceBadgeClass(match.chanceLevel || '')}`}
              data-testid="text-chance-level"
            >
              {match.chanceLevel}
            </Badge>
          </div>
          
          <p className="text-sm text-gray-600 mb-2" data-testid="text-scholarship-organization">
            {scholarship.organization} - ${scholarship.amount?.toLocaleString()}
          </p>
          
          <p className="text-xs text-gray-500 mb-3" data-testid="text-scholarship-description">
            {scholarship.description}
          </p>
          
          <div className="flex items-center space-x-4 text-xs text-gray-500">
            <span className="flex items-center" data-testid="text-deadline">
              <Calendar className="w-3 h-3 mr-1" />
              Due: {formatDeadline(scholarship.deadline)}
              {daysUntilDeadline <= 7 && (
                <span className="ml-1 text-red-600 font-medium">
                  ({daysUntilDeadline} days left)
                </span>
              )}
            </span>
            {scholarship.estimatedApplicants && (
              <span className="flex items-center" data-testid="text-applicants">
                <Users className="w-3 h-3 mr-1" />
                ~{scholarship.estimatedApplicants.toLocaleString()} applicants
              </span>
            )}
          </div>
        </div>
        
        <div className="flex space-x-2 ml-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onBookmark(match.id, !match.isBookmarked)}
            className={`p-2 transition-colors ${
              match.isBookmarked 
                ? 'text-green-600 hover:text-green-700' 
                : 'text-gray-400 hover:text-green-600'
            }`}
            data-testid="button-bookmark"
          >
            <Bookmark className={`w-4 h-4 ${match.isBookmarked ? 'fill-current' : ''}`} />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDismiss(match.id)}
            className="p-2 text-gray-400 hover:text-red-600 transition-colors"
            data-testid="button-dismiss"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
