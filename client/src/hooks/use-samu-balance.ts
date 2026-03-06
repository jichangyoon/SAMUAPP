import { useQuery } from "@tanstack/react-query";

export function useSamuBalance(walletAddress: string | undefined) {
  return useQuery({
    queryKey: ['samu-balance', walletAddress],
    queryFn: async () => {
      if (!walletAddress) return { balance: 0 };
      const res = await fetch(`/api/samu-balance/${walletAddress}`);
      if (!res.ok) throw new Error('Failed to fetch SAMU balance');
      return res.json();
    },
    enabled: !!walletAddress,
    staleTime: 30000,
  });
}
