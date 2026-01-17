import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { resilientApiRequest, resilientFetch, APIError } from "./apiResilience";

// QA-023: Enhanced error handling with resilience patterns
async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new APIError(`${res.status}: ${text}`, res.status, res.status >= 500);
  }
}

// QA-023: Resilient API request with retry logic and circuit breaker
export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const res = await resilientFetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

// QA-023: Enhanced query function with resilience patterns
type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    try {
      const res = await resilientFetch(queryKey.join("/") as string, {
        credentials: "include",
      });

      if (unauthorizedBehavior === "returnNull" && res.status === 401) {
        return null;
      }

      await throwIfResNotOk(res);
      return await res.json();
    } catch (error) {
      // Special handling for unauthorized errors in auth contexts
      if (error instanceof APIError && error.status === 401 && unauthorizedBehavior === "returnNull") {
        return null;
      }
      throw error;
    }
  };

// Test mode detection (URL param ?e2e=1 or env var)
const isTestMode = new URLSearchParams(window.location.search).has('e2e') || 
                   import.meta.env.VITE_E2E_MODE === '1';

// Build ID for versioned query keys (prevents cross-build cache pollution)
export const BUILD_ID = import.meta.env.VITE_BUILD_ID || Date.now().toString();

// QA-023: Enhanced QueryClient with smart retry logic + test mode hygiene
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchOnWindowFocus: 'always', // Zero-Staleness: Always refetch on focus
      staleTime: isTestMode ? 0 : 5000, // Zero-Staleness: 5-second SLA for data freshness
      gcTime: isTestMode ? 0 : 30000, // 30 second garbage collection
      refetchOnMount: 'always', // Zero-Staleness: Always refetch on mount
      refetchInterval: isTestMode ? false : 5000, // Zero-Staleness: Poll every 5 seconds
      // Smart retry: let our resilience layer handle retries for network errors
      retry: (failureCount, error) => {
        if (isTestMode) return false; // No retries in test mode for faster feedback
        // Don't retry if our resilience layer already handled it
        if (error instanceof APIError) {
          return false; // Let circuit breaker and retry manager handle it
        }
        // Retry up to 2 times for other errors
        return failureCount < 2;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
      networkMode: isTestMode ? 'always' : 'online', // Bypass offline checks in test
    },
    mutations: {
      // Mutations use the resilience layer directly, no additional retry needed
      retry: false,
    },
  },
});

// Test mode: Clear all caches on initialization
if (isTestMode) {
  queryClient.clear();
  console.log('[E2E] React Query cache cleared - test mode active');
}

// Expose E2E utilities for test harness
declare global {
  interface Window {
    E2E?: {
      resetRQ: () => void;
      queryClient: QueryClient;
    };
  }
}

if (isTestMode) {
  window.E2E = {
    resetRQ: () => {
      queryClient.clear();
      queryClient.invalidateQueries({ predicate: () => true });
      console.log('[E2E] React Query cache manually reset');
    },
    queryClient,
  };
}
