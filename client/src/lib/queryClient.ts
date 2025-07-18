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
  // 디바이스 ID 가져오기 (이미 App.tsx에서 초기화됨)
  const deviceId = localStorage.getItem('samu_device_id');

  const headers: Record<string, string> = data ? { "Content-Type": "application/json" } : {};
  if (deviceId) {
    headers['x-device-id'] = deviceId;
    console.log(`API 요청에 디바이스 ID 포함: ${deviceId} -> ${url}`);
  } else {
    console.warn(`API 요청에 디바이스 ID 없음: ${url}`);
  }

  const res = await fetch(url, {
    method,
    headers,
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
    // 디바이스 ID 가져오기 (이미 App.tsx에서 초기화됨)
    const deviceId = localStorage.getItem('samu_device_id');

    const headers: Record<string, string> = {};
    if (deviceId) {
      headers['x-device-id'] = deviceId;
      console.log(`쿼리 요청에 디바이스 ID 포함: ${deviceId} -> ${queryKey[0]}`);
    } else {
      console.warn(`쿼리 요청에 디바이스 ID 없음: ${queryKey[0]}`);
    }

    const res = await fetch(queryKey[0] as string, {
      credentials: "include",
      headers,
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