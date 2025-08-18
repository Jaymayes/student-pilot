// Shared types between client and server
export interface ScholarshipMatch {
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
    deadline: string; // ISO string format
    description?: string | null;
  };
}

export interface Application {
  id: string;
  studentId: string;
  scholarshipId: string;
  status: 'draft' | 'in_progress' | 'submitted' | 'under_review' | 'accepted' | 'rejected';
  progressPercentage: number | null;
  submittedAt: string | null; // ISO string format
  notes: string | null;
  createdAt: string; // ISO string format
  updatedAt: string; // ISO string format
}

export interface Essay {
  id: string;
  studentId: string;
  title: string;
  prompt: string | null;
  content: string | null;
  outline: any;
  feedback: string[] | null;
  wordCount: number | null;
  createdAt: string; // ISO string format
  updatedAt: string; // ISO string format
}