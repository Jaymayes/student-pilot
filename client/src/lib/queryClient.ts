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

// QA-023: Enhanced QueryClient with smart retry logic
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes cache for better UX
      // Smart retry: let our resilience layer handle retries for network errors
      retry: (failureCount, error) => {
        // Don't retry if our resilience layer already handled it
        if (error instanceof APIError) {
          return false; // Let circuit breaker and retry manager handle it
        }
        // Retry up to 2 times for other errors
        return failureCount < 2;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
    },
    mutations: {
      // Mutations use the resilience layer directly, no additional retry needed
      retry: false,
    },
  },
});
