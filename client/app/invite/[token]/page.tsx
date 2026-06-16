"use client";
import { useEffect, useState, FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { pageBg } from "@/lib/ui";
import { useAuthStore } from "@/store/authStore";

interface InviteInfo {
  email: string;
  role: string;
  tenantName: string;
  inviterName: string;
}

type Status = "loading" | "ready" | "accepted" | "error";

export default function AcceptInvitePage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();
  const { setAuth } = useAuthStore();

  const [status, setStatus] = useState<Status>("loading");
  const [info, setInfo] = useState<InviteInfo | null>(null);
  const [errorMsg, setErrorMsg] = useState("This invite link is invalid or has expired.");

  // Accept form
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [accepting, setAccepting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Validate the token on mount
  useEffect(() => {
    if (!token) { setStatus("error"); return; }

    api
      .get<InviteInfo>(`/invite/${token}`)
      .then((res) => {
        setInfo(res.data);
        setStatus("ready");
      })
      .catch((err) => {
        setErrorMsg(err.message || "This invite link is invalid or has expired.");
        setStatus("error");
      });
  }, [token]);

  const handleAccept = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setAccepting(true);

    try {
      const res = await api.post<{
        accessToken: string;
        user: { id: string; name: string; email: string; role: string };
        tenant: { id: string; name: string; slug: string };
      }>(`/invite/${token}/accept`, { name, password });

      // Log the user in with the returned access token
      setAuth(res.data.user, res.data.accessToken);

      setStatus("accepted");
      setTimeout(() => router.push("/dashboard"), 2000);
    } catch (err: any) {
      setFormError(err.message || "Failed to accept invite. Please try again.");
    } finally {
      setAccepting(false);
    }
  };

  return (
    <div className={`flex min-h-screen items-center justify-center ${pageBg} p-4`}>
      <div className="w-full max-w-md overflow-hidden rounded-3xl bg-white p-8 text-center shadow-2xl sm:p-10">

        {/* Loading */}
        {status === "loading" && (
          <>
            <p className="mb-4 text-5xl">⏳</p>
            <h1 className="text-2xl font-bold text-gray-800">Validating invite…</h1>
          </>
        )}

        {/* Ready — show the accept form */}
        {status === "ready" && info && (
          <>
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-2xl text-white">
              📋
            </div>
            <h1 className="text-2xl font-bold text-gray-800">You&apos;re invited!</h1>
            <p className="mt-2 text-sm text-gray-500">
              <strong>{info.inviterName}</strong> invited you to join{" "}
              <strong>{info.tenantName}</strong> as <strong>{info.role}</strong>.
            </p>
            <p className="mt-1 text-xs text-gray-400">Joining as {info.email}</p>

            <form onSubmit={handleAccept} className="mt-6 space-y-4 text-left">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Your name
                </label>
                <input
                  required
                  autoFocus
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Jane Doe"
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-500/30"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Choose a password
                </label>
                <input
                  required
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min 8 chars, 1 uppercase, 1 number"
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-500/30"
                />
              </div>

              {formError && (
                <p className="text-sm text-red-500">{formError}</p>
              )}

              <button
                type="submit"
                disabled={accepting}
                className="w-full rounded-full bg-gradient-to-r from-brand-600 to-brand-500 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-500/30 disabled:opacity-60"
              >
                {accepting ? "Creating your account…" : "Accept invite & join"}
              </button>
            </form>
          </>
        )}

        {/* Accepted */}
        {status === "accepted" && (
          <>
            <p className="mb-4 text-5xl">🎉</p>
            <h1 className="text-2xl font-bold text-gray-800">Welcome aboard!</h1>
            <p className="mt-2 text-sm text-gray-400">
              Your account is ready. Taking you to the dashboard…
            </p>
          </>
        )}

        {/* Error */}
        {status === "error" && (
          <>
            <p className="mb-4 text-5xl">⚠️</p>
            <h1 className="text-2xl font-bold text-gray-800">Invite unavailable</h1>
            <p className="mt-2 text-sm text-gray-400">{errorMsg}</p>
            <Link
              href="/login"
              className="mt-6 block text-sm font-semibold text-brand-600 hover:text-brand-700"
            >
              Go to login
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
