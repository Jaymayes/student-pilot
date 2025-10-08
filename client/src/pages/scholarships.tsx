import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { Navigation } from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Filter, Calendar, DollarSign } from "lucide-react";

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
  
  const [searchTerm, setSearchTerm] = useState("");
  const [amountFilter, setAmountFilter] = useState("all");

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

  // Fetch all scholarships (browse mode)
  const { data: scholarships, isLoading } = useQuery<any[]>({
    queryKey: ["/api/scholarships"],
    retry: false,
  });

  // Browse mode doesn't support bookmark/dismiss (these are match-specific operations)
  // Users can bookmark from the personalized matches page instead

  // Filter scholarships based on search and filters
  const filteredScholarships = scholarships?.filter(scholarship => {
    const matchesSearch = scholarship.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         scholarship.organization?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesAmount = amountFilter === "all" || 
                         (amountFilter === "under5k" && scholarship.amount < 5000) ||
                         (amountFilter === "5k-10k" && scholarship.amount >= 5000 && scholarship.amount < 10000) ||
                         (amountFilter === "over10k" && scholarship.amount >= 10000);

    return matchesSearch && matchesAmount;
  }) || [];

  // Sort scholarships by amount (highest first) and then by deadline
  const sortedScholarships = filteredScholarships.sort((a, b) => {
    if (a.amount !== b.amount) {
      return (b.amount || 0) - (a.amount || 0);
    }
    return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
  });

  const bookmarkedCount = 0; // Not applicable in browse mode
  const highChanceCount = 0; // Not applicable in browse mode

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

                {/* Chance Level Filter not available in browse mode (match-specific) */}

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

                {/* Bookmarked filter not available in browse mode */}

                {/* Stats */}
                <div className="pt-4 border-t border-gray-200 space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Total Matches:</span>
                    <span className="font-medium" data-testid="text-total-matches">
                      {scholarships?.length || 0}
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
                  {filteredScholarships.length} Scholarships Found
                </h2>
                <p className="text-sm text-gray-600">
                  Sorted by amount and deadline
                </p>
              </div>
              
              {searchTerm || amountFilter !== "all" ? (
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchTerm("");
                    setAmountFilter("all");
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
            ) : sortedScholarships.length > 0 ? (
              <div className="space-y-4">
                {sortedScholarships.map((scholarship) => (
                  <Card key={scholarship.id} className="p-6 hover:shadow-lg transition-shadow" data-testid={`card-scholarship-${scholarship.id}`}>
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">{scholarship.title}</h3>
                        <p className="text-sm text-gray-600 mb-2">{scholarship.organization}</p>
                        <p className="text-sm text-gray-700 mb-4">{scholarship.description}</p>
                        <div className="flex items-center space-x-4 text-sm">
                          <Badge className="bg-green-100 text-green-800">
                            <DollarSign className="w-3 h-3 mr-1" />
                            ${scholarship.amount?.toLocaleString()}
                          </Badge>
                          <span className="flex items-center text-gray-600">
                            <Calendar className="w-4 h-4 mr-1" />
                            {new Date(scholarship.deadline).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="p-12">
                <div className="text-center">
                  <Search className="mx-auto h-12 w-12 text-gray-300 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    No scholarships found
                  </h3>
                  {searchTerm || amountFilter !== "all" ? (
                    <div className="space-y-2">
                      <p className="text-gray-600">
                        Try adjusting your search criteria or filters.
                      </p>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setSearchTerm("");
                          setAmountFilter("all");
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
