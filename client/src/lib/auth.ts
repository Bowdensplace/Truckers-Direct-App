import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "./queryClient";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  picture: string;
}

export function useAuth() {
  const { data, isLoading, error } = useQuery<{ user: AuthUser | null }>({
    queryKey: ["/auth/me"],
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  return {
    user: data?.user ?? null,
    isLoading,
    isAuthenticated: !!data?.user,
    error,
  };
}

export function useLogout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => apiRequest("POST", "/auth/logout"),
    onSuccess: () => {
      qc.setQueryData(["/auth/me"], { user: null });
      qc.clear();
      // Redirect to login
      window.location.hash = "/login";
    },
  });
}
