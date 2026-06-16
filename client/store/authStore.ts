import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
}

export interface AuthState {
  user: User | null;
  accessToken: string | null;
  /** True once zustand has rehydrated `user` from localStorage. Guards use this
   * to avoid redirecting a logged-in user to /login during the initial render. */
  hasHydrated: boolean;
  setAuth: (user: User, accessToken: string) => void;
  setAccessToken: (accessToken: string) => void;
  setHasHydrated: (hasHydrated: boolean) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      hasHydrated: false,
      setAuth: (user: User, accessToken: string) => set({ user, accessToken }),
      setAccessToken: (accessToken: string) => set({ accessToken }),
      setHasHydrated: (hasHydrated: boolean) => set({ hasHydrated }),
      clearAuth: () => set({ user: null, accessToken: null }),
    }),
    {
      name: "taskflow-auth",
      partialize: (state) => ({ user: state.user }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);
