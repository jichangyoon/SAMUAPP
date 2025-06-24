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
      staleTime: 5 * 60 * 1000, // 5분 기본 캐시
      gcTime: 10 * 60 * 1000, // 10분 가비지 컬렉션
      refetchOnReconnect: 'always',
      networkMode: 'online',
      // 동일한 요청 중복 방지
      structuralSharing: true,
      retry: (failureCount, error) => {
        // 네트워크 오류만 재시도, 최대 2회
        if (failureCount >= 2) return false;
        if (error?.message?.includes('Failed to fetch')) return true;
        // 401, 403, 404는 재시도 안함
        if (error?.message?.includes('401') || error?.message?.includes('403') || error?.message?.includes('404')) return false;
        return false;
      },
      retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000), // 지수 백오프
    },
    mutations: {
      retry: 0,
      networkMode: 'online',
      onError: (error) => {
        // 전역 에러 처리 (필요시 토스트 표시)
        console.error('Mutation error:', error);
      },
      gcTime: 5 * 60 * 1000,
    },
  },
});