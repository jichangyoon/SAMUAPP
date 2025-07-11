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
      refetchOnMount: false, // 마운트시 재요청 방지
      refetchOnReconnect: false,
      staleTime: 2 * 60 * 1000, // 2분 캐시 (더 길게)
      gcTime: 5 * 60 * 1000, // 5분 가비지 컬렉션
      networkMode: 'online',
      retry: (failureCount, error) => {
        // 네트워크 오류만 재시도, 최대 1회로 축소
        if (failureCount >= 1) return false;
        if (error?.message?.includes('Failed to fetch')) return true;
        return false;
      },
      retryDelay: 1000, // 1초 고정 딜레이
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