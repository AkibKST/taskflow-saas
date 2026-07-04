import { create } from "zustand";
import { persist } from "zustand/middleware";
import Cookies from "js-cookie";

export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
}

// A non-sensitive presence flag on the CLIENT domain (the real refresh token is
// an httpOnly cookie on the API domain, unreadable by Next middleware). It lets
// middleware.ts gate protected routes at the edge and stops the logged-out flash.
const SESSION_FLAG = "tf_session";
const setSessionFlag = () => {
  if (typeof document !== "undefined")
    Cookies.set(SESSION_FLAG, "1", { expires: 7, sameSite: "lax" });
};
const clearSessionFlag = () => {
  if (typeof document !== "undefined") Cookies.remove(SESSION_FLAG);
};

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
      setAuth: (user: User, accessToken: string) => {
        setSessionFlag();
        set({ user, accessToken });
      },
      setAccessToken: (accessToken: string) => set({ accessToken }),
      setHasHydrated: (hasHydrated: boolean) => set({ hasHydrated }),
      clearAuth: () => {
        clearSessionFlag();
        set({ user: null, accessToken: null });
      },
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
