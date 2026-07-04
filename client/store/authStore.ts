import { create } from "zustand";
import { persist, createJSONStorage, StateStorage } from "zustand/middleware";
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
// "Remember me" choice — decides whether the session survives closing the
// browser (localStorage + 7-day cookie) or ends with it (sessionStorage +
// session cookie).
const REMEMBER_KEY = "tf_remember";

const setSessionFlag = (remember: boolean) => {
  if (typeof document !== "undefined")
    Cookies.set(SESSION_FLAG, "1", {
      ...(remember && { expires: 7 }),
      sameSite: "lax",
    });
};
const clearSessionFlag = () => {
  if (typeof document !== "undefined") Cookies.remove(SESSION_FLAG);
};

/**
 * Routes persisted auth to localStorage ("remember me", survives the browser
 * closing) or sessionStorage (this tab session only), based on the choice made
 * at sign-in.
 */
const authStorage: StateStorage = {
  getItem: (name) =>
    sessionStorage.getItem(name) ?? localStorage.getItem(name),
  setItem: (name, value) => {
    if (localStorage.getItem(REMEMBER_KEY) === "0") {
      sessionStorage.setItem(name, value);
      localStorage.removeItem(name);
    } else {
      localStorage.setItem(name, value);
      sessionStorage.removeItem(name);
    }
  },
  removeItem: (name) => {
    sessionStorage.removeItem(name);
    localStorage.removeItem(name);
  },
};

/** SSR stand-in — web storage doesn't exist on the server. */
const noopStorage: StateStorage = {
  getItem: () => null,
  setItem: () => undefined,
  removeItem: () => undefined,
};

export interface AuthState {
  user: User | null;
  accessToken: string | null;
  /** True once zustand has rehydrated `user` from storage. Guards use this
   * to avoid redirecting a logged-in user to /login during the initial render. */
  hasHydrated: boolean;
  setAuth: (user: User, accessToken: string, remember?: boolean) => void;
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
      setAuth: (user: User, accessToken: string, remember: boolean = true) => {
        if (typeof window !== "undefined")
          localStorage.setItem(REMEMBER_KEY, remember ? "1" : "0");
        setSessionFlag(remember);
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
      storage: createJSONStorage(() =>
        typeof window === "undefined" ? noopStorage : authStorage,
      ),
      partialize: (state) => ({ user: state.user }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);
