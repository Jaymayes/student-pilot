import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ExternalLink, Star, TrendingUp, Award } from 'lucide-react';
import { Link } from 'wouter';
import type { PartnerPromotion } from '@shared/types/partner';

interface PromotedScholarshipCardProps {
  scholarship: {
    id: string;
    title: string;
    organization: string;
    amount: number;
    deadline: string;
    description: string;
    slug?: string;
  };
  promotion: PartnerPromotion;
  onView?: () => void;
  onClick?: () => void;
  onPartnerClick?: () => void;
  className?: string;
}

/**
 * Enhanced scholarship card for partner-promoted content
 * Displays promotion indicators and partner branding
 */
export function PromotedScholarshipCard({
  scholarship,
  promotion,
  onView,
  onClick,
  onPartnerClick,
  className = ''
}: PromotedScholarshipCardProps) {
  const promotionConfig = {
    standard: {
      icon: TrendingUp,
      label: 'Promoted',
      color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      priority: 1
    },
    featured: {
      icon: Star,
      label: 'Featured',
      color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
      priority: 2
    },
    premium: {
      icon: Award,
      label: 'Premium Sponsor',
      color: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
      priority: 3
    }
  };

  const config = promotionConfig[promotion.promotionLevel];
  const IconComponent = config.icon;

  // Track view event when component mounts
  React.useEffect(() => {
    if (onView) {
      onView();
    }
  }, [onView]);

  const handleCardClick = () => {
    if (onClick) {
      onClick();
    }
  };

  const handlePartnerClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onPartnerClick) {
      onPartnerClick();
    }
  };

  const formatDeadline = (deadline: string) => {
    const date = new Date(deadline);
    const now = new Date();
    const diffDays = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return 'Expired';
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays <= 7) return `${diffDays} days left`;
    if (diffDays <= 30) return `${Math.ceil(diffDays / 7)} weeks left`;
    return date.toLocaleDateString();
  };

  return (
    <Card 
      className={`relative overflow-hidden transition-all duration-200 hover:shadow-lg cursor-pointer ${
        promotion.promotionLevel === 'premium' ? 'ring-2 ring-amber-200 dark:ring-amber-800' :
        promotion.promotionLevel === 'featured' ? 'ring-1 ring-purple-200 dark:ring-purple-800' :
        'ring-1 ring-blue-200 dark:ring-blue-800'
      } ${className}`}
      onClick={handleCardClick}
      data-testid={`promoted-scholarship-card-${scholarship.id}`}
    >
      {/* Promotion Banner */}
      <div className={`absolute top-0 right-0 z-10 px-3 py-1 text-xs font-semibold rounded-bl-lg ${config.color}`}>
        <div className="flex items-center gap-1">
          <IconComponent className="h-3 w-3" />
          <span>{config.label}</span>
        </div>
      </div>

      {/* Premium Gradient Border */}
      {promotion.promotionLevel === 'premium' && (
        <div className="absolute inset-0 bg-gradient-to-r from-amber-200 via-yellow-200 to-amber-200 dark:from-amber-800 dark:via-yellow-800 dark:to-amber-800 opacity-20 pointer-events-none" />
      )}

      <CardHeader className="pb-3">
        <div className="flex justify-between items-start gap-3">
          <div className="flex-1">
            <h3 className="font-semibold text-lg leading-tight mb-1 line-clamp-2">
              {scholarship.title}
            </h3>
            <p className="text-sm text-muted-foreground">
              {scholarship.organization}
            </p>
          </div>
          <div className="text-right flex-shrink-0">
            <div className="text-xl font-bold text-green-600 dark:text-green-400">
              ${scholarship.amount.toLocaleString()}
            </div>
            <div className="text-xs text-muted-foreground">
              {formatDeadline(scholarship.deadline)}
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <p className="text-sm text-muted-foreground mb-4 line-clamp-3">
          {scholarship.description}
        </p>

        {/* Promotion Indicators */}
        <div className="flex items-center gap-2 mb-4">
          <Badge variant="secondary" className="text-xs">
            Sponsored Content
          </Badge>
          {promotion.rankingScore && (
            <Badge variant="outline" className="text-xs">
              {promotion.rankingScore}% Match
            </Badge>
          )}
          {promotion.eligibilityFlags?.gpaRequirement && (
            <Badge variant="outline" className="text-xs">
              {promotion.eligibilityFlags.gpaRequirement}+ GPA
            </Badge>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button 
            asChild 
            className="flex-1"
            data-testid={`view-scholarship-${scholarship.id}`}
          >
            <Link href={`/scholarships/${scholarship.id}/${scholarship.slug || 'details'}`}>
              View Details
            </Link>
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handlePartnerClick}
            className="flex items-center gap-1 px-3"
            data-testid={`partner-link-${scholarship.id}`}
          >
            <ExternalLink className="h-3 w-3" />
            <span className="sr-only">Visit Partner</span>
          </Button>
        </div>

        {/* Partner Attribution */}
        <div className="mt-3 pt-3 border-t text-xs text-muted-foreground">
          <p>
            Promoted by {scholarship.organization} • 
            <button 
              onClick={handlePartnerClick}
              className="ml-1 underline hover:no-underline"
              data-testid={`partner-attribution-${scholarship.id}`}
            >
              Learn more about this partnership
            </button>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Compact promoted scholarship card for lists and grids
 */
export function CompactPromotedScholarshipCard({
  scholarship,
  promotion,
  onView,
  onClick,
  className = ''
}: Omit<PromotedScholarshipCardProps, 'onPartnerClick'>) {
  const config = {
    standard: { color: 'bg-blue-100 text-blue-800', icon: TrendingUp },
    featured: { color: 'bg-purple-100 text-purple-800', icon: Star },
    premium: { color: 'bg-amber-100 text-amber-800', icon: Award }
  };

  const promotionConfig = config[promotion.promotionLevel];
  const IconComponent = promotionConfig.icon;

  React.useEffect(() => {
    if (onView) onView();
  }, [onView]);

  return (
    <div 
      className={`relative p-4 border rounded-lg hover:shadow-md transition-shadow cursor-pointer ${className}`}
      onClick={onClick}
      data-testid={`compact-promoted-scholarship-${scholarship.id}`}
    >
      {/* Promotion Indicator */}
      <div className={`absolute top-2 right-2 px-2 py-1 text-xs font-medium rounded ${promotionConfig.color}`}>
        <div className="flex items-center gap-1">
          <IconComponent className="h-3 w-3" />
          <span>Sponsored</span>
        </div>
      </div>

      <div className="pr-20"> {/* Space for promotion indicator */}
        <h4 className="font-medium text-sm mb-1 line-clamp-2">
          {scholarship.title}
        </h4>
        <p className="text-xs text-muted-foreground mb-2">
          {scholarship.organization}
        </p>
        <div className="flex justify-between items-center">
          <span className="font-semibold text-green-600 dark:text-green-400">
            ${scholarship.amount.toLocaleString()}
          </span>
          <span className="text-xs text-muted-foreground">
            {new Date(scholarship.deadline).toLocaleDateString()}
          </span>
        </div>
      </div>
    </div>
  );
}