import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey[0] as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: 30 * 1000, // 30초 캐시 (더 빠른 업데이트)
      gcTime: 2 * 60 * 1000, // 2분 가비지 컬렉션 (메모리 절약)
      refetchOnReconnect: 'always',
      networkMode: 'online',
      retry: (failureCount, error) => {
        // 네트워크 오류만 재시도, 최대 2회
        if (failureCount >= 2) return false;
        if (error?.message?.includes('Failed to fetch')) return true;
        return false;
      },
      retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000), // 지수 백오프
    },
    mutations: {
      retry: 0,
      networkMode: 'online',
      onError: (error) => {
        // Silent error handling for production
      },
      gcTime: 5 * 60 * 1000,
    },
  },
});