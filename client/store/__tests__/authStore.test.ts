import { describe, it, expect, beforeEach } from "vitest";
import Cookies from "js-cookie";
import { useAuthStore, User } from "../authStore";

const user: User = { id: "u1", email: "a@b.c", name: "Ada", role: "OWNER" };

const state = () => useAuthStore.getState();

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  Cookies.remove("tf_session");
  useAuthStore.setState({ user: null, accessToken: null });
});

describe("auth store", () => {
  it("setAuth stores the user, token and session-flag cookie", () => {
    state().setAuth(user, "token-1");

    expect(state().user).toEqual(user);
    expect(state().accessToken).toBe("token-1");
    expect(Cookies.get("tf_session")).toBe("1");
  });

  it('"remember me" persists the user to localStorage', () => {
    state().setAuth(user, "token-1", true);

    const persisted = localStorage.getItem("taskflow-auth");
    expect(persisted).toContain("a@b.c");
    expect(sessionStorage.getItem("taskflow-auth")).toBeNull();
  });

  it("without remember, the user lives in sessionStorage only", () => {
    state().setAuth(user, "token-1", false);

    expect(sessionStorage.getItem("taskflow-auth")).toContain("a@b.c");
    expect(localStorage.getItem("taskflow-auth")).toBeNull();
  });

  it("only the user is persisted — never the access token", () => {
    state().setAuth(user, "super-secret-token", true);
    expect(localStorage.getItem("taskflow-auth")).not.toContain("super-secret-token");
  });

  it("clearAuth wipes state and the session-flag cookie", () => {
    state().setAuth(user, "token-1");
    state().clearAuth();

    expect(state().user).toBeNull();
    expect(state().accessToken).toBeNull();
    expect(Cookies.get("tf_session")).toBeUndefined();
  });
});
