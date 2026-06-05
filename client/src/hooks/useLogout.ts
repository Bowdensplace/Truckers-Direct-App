import { useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useLocation } from "wouter";

export function useLogout() {
  const [, navigate] = useLocation();

  return useMutation({
    mutationFn: async () => {
      await fetch("/auth/logout", { method: "POST", credentials: "include" });
    },
    onSuccess: () => {
      queryClient.clear();
      navigate("/login");
    },
  });
}
