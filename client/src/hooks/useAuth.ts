import { useQuery } from "@tanstack/react-query";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  picture: string;
}

export function useAuth() {
  const { data, isLoading, error } = useQuery<{ user: AuthUser | null }>({
    queryKey: ["/auth/me"],
    queryFn: async () => {
      const res = await fetch("/auth/me", { credentials: "include" });
      if (!res.ok) return { user: null };
      return res.json();
    },
    retry: false,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  return {
    user: data?.user ?? null,
    isLoading,
    isError: !!error,
  };
}
