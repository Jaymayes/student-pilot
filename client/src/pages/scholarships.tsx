import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Navigation } from "@/components/Navigation";
import { ScholarshipCard } from "@/components/ScholarshipCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";
import { Search, Filter, BookmarkIcon, Calendar, DollarSign } from "lucide-react";

interface ScholarshipMatch {
  id: string;
  studentId: string;
  scholarshipId: string;
  matchScore: number | null;
  matchReason: string[] | null;
  chanceLevel: string | null;
  isBookmarked: boolean | null;
  isDismissed: boolean | null;
  createdAt: string;
  scholarship: {
    id: string;
    title: string;
    organization: string;
    amount: number;
    description: string;
    deadline: string;
    estimatedApplicants: number;
  };
}

export default function Scholarships() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [searchTerm, setSearchTerm] = useState("");
  const [chanceFilter, setChanceFilter] = useState("all");
  const [amountFilter, setAmountFilter] = useState("all");
  const [bookmarkedOnly, setBookmarkedOnly] = useState(false);

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

  // Fetch scholarship matches
  const { data: matches, isLoading } = useQuery<ScholarshipMatch[]>({
    queryKey: ["/api/matches"],
    retry: false,
  });

  // Bookmark mutation
  const bookmarkMutation = useMutation({
    mutationFn: async ({ id, bookmarked }: { id: string; bookmarked: boolean }) => {
      await apiRequest("POST", `/api/matches/${id}/bookmark`, { bookmarked });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/matches"] });
      toast({
        title: "Success",
        description: bookmarkMutation.variables?.bookmarked ? "Scholarship bookmarked" : "Bookmark removed",
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
        description: "Failed to update bookmark",
        variant: "destructive",
      });
    },
  });

  // Dismiss mutation
  const dismissMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("POST", `/api/matches/${id}/dismiss`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/matches"] });
      toast({
        title: "Success",
        description: "Scholarship dismissed",
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
        description: "Failed to dismiss scholarship",
        variant: "destructive",
      });
    },
  });

  const handleBookmark = (id: string, bookmarked: boolean) => {
    bookmarkMutation.mutate({ id, bookmarked });
  };

  const handleDismiss = (id: string) => {
    dismissMutation.mutate(id);
  };

  // Filter matches based on search and filters
  const filteredMatches = matches?.filter(match => {
    const matchesSearch = match.scholarship.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         match.scholarship.organization.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesChance = chanceFilter === "all" || 
                         match.chanceLevel?.toLowerCase() === chanceFilter.toLowerCase();
    
    const matchesAmount = amountFilter === "all" || 
                         (amountFilter === "under5k" && match.scholarship.amount < 5000) ||
                         (amountFilter === "5k-10k" && match.scholarship.amount >= 5000 && match.scholarship.amount < 10000) ||
                         (amountFilter === "over10k" && match.scholarship.amount >= 10000);
    
    const matchesBookmarked = !bookmarkedOnly || match.isBookmarked;

    return matchesSearch && matchesChance && matchesAmount && matchesBookmarked;
  }) || [];

  // Sort matches by score (highest first) and then by deadline
  const sortedMatches = filteredMatches.sort((a, b) => {
    if (a.matchScore !== b.matchScore) {
      return (b.matchScore || 0) - (a.matchScore || 0);
    }
    return new Date(a.scholarship.deadline).getTime() - new Date(b.scholarship.deadline).getTime();
  });

  const bookmarkedCount = matches?.filter(m => m.isBookmarked).length || 0;
  const highChanceCount = matches?.filter(m => m.chanceLevel?.toLowerCase() === "high chance").length || 0;

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
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2" data-testid="text-scholarships-title">
            Scholarship Opportunities
          </h1>
          <p className="text-gray-600">
            Discover scholarships matched to your profile and interests.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Filters Sidebar */}
          <div className="lg:col-span-1">
            <Card className="border border-gray-200 sticky top-20">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Filter className="w-5 h-5" />
                  <span>Filters</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Search */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Search
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      placeholder="Search scholarships..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                      data-testid="input-search-scholarships"
                    />
                  </div>
                </div>

                {/* Chance Level Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Chance Level
                  </label>
                  <Select value={chanceFilter} onValueChange={setChanceFilter}>
                    <SelectTrigger data-testid="select-chance-filter">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Chances</SelectItem>
                      <SelectItem value="high chance">High Chance</SelectItem>
                      <SelectItem value="competitive">Competitive</SelectItem>
                      <SelectItem value="long shot">Long Shot</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Amount Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Award Amount
                  </label>
                  <Select value={amountFilter} onValueChange={setAmountFilter}>
                    <SelectTrigger data-testid="select-amount-filter">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Any Amount</SelectItem>
                      <SelectItem value="under5k">Under $5,000</SelectItem>
                      <SelectItem value="5k-10k">$5,000 - $10,000</SelectItem>
                      <SelectItem value="over10k">Over $10,000</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Bookmarked Only */}
                <div>
                  <Button
                    variant={bookmarkedOnly ? "default" : "outline"}
                    onClick={() => setBookmarkedOnly(!bookmarkedOnly)}
                    className="w-full flex items-center space-x-2"
                    data-testid="button-bookmarked-filter"
                  >
                    <BookmarkIcon className="w-4 h-4" />
                    <span>Bookmarked Only</span>
                  </Button>
                </div>

                {/* Stats */}
                <div className="pt-4 border-t border-gray-200 space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Total Matches:</span>
                    <span className="font-medium" data-testid="text-total-matches">
                      {matches?.length || 0}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Bookmarked:</span>
                    <span className="font-medium text-green-600" data-testid="text-bookmarked-count">
                      {bookmarkedCount}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">High Chance:</span>
                    <span className="font-medium text-green-600" data-testid="text-high-chance-count">
                      {highChanceCount}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {/* Results Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-semibold text-gray-900" data-testid="text-results-header">
                  {filteredMatches.length} Scholarships Found
                </h2>
                <p className="text-sm text-gray-600">
                  Sorted by match score and deadline
                </p>
              </div>
              
              {searchTerm || chanceFilter !== "all" || amountFilter !== "all" || bookmarkedOnly ? (
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchTerm("");
                    setChanceFilter("all");
                    setAmountFilter("all");
                    setBookmarkedOnly(false);
                  }}
                  data-testid="button-clear-filters"
                >
                  Clear Filters
                </Button>
              ) : null}
            </div>

            {/* Scholarships List */}
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map(i => (
                  <Card key={i} className="p-6">
                    <div className="animate-pulse">
                      <div className="flex justify-between">
                        <div className="space-y-2 flex-1">
                          <Skeleton className="h-6 w-3/4" />
                          <Skeleton className="h-4 w-1/2" />
                          <Skeleton className="h-3 w-full" />
                          <Skeleton className="h-3 w-2/3" />
                        </div>
                        <div className="flex space-x-2">
                          <Skeleton className="h-8 w-8" />
                          <Skeleton className="h-8 w-8" />
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : sortedMatches.length > 0 ? (
              <div className="space-y-4">
                {sortedMatches.map((match) => (
                  <ScholarshipCard
                    key={match.id}
                    match={match}
                    onBookmark={handleBookmark}
                    onDismiss={handleDismiss}
                  />
                ))}
              </div>
            ) : (
              <Card className="p-12">
                <div className="text-center">
                  <Search className="mx-auto h-12 w-12 text-gray-300 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    No scholarships found
                  </h3>
                  {searchTerm || chanceFilter !== "all" || amountFilter !== "all" || bookmarkedOnly ? (
                    <div className="space-y-2">
                      <p className="text-gray-600">
                        Try adjusting your search criteria or filters.
                      </p>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setSearchTerm("");
                          setChanceFilter("all");
                          setAmountFilter("all");
                          setBookmarkedOnly(false);
                        }}
                        data-testid="button-clear-filters-empty"
                      >
                        Clear All Filters
                      </Button>
                    </div>
                  ) : (
                    <p className="text-gray-600">
                      Complete your profile to discover scholarship opportunities.
                    </p>
                  )}
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
