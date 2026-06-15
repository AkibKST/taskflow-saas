"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { pageBg } from "@/lib/ui";
import { useAuthStore } from "@/store/authStore";

type Status = "loading" | "ready" | "accepted" | "error";

export default function AcceptInvitePage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();
  const { user } = useAuthStore();
  const [status, setStatus] = useState<Status>("loading");
  const [projectName, setProjectName] = useState("a project");
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    if (!token) { setStatus("error"); return; }
    setTimeout(() => {
      setProjectName("Website Redesign");
      setStatus("ready");
    }, 600);
  }, [token]);

  const handleAccept = async () => {
    if (!user) {
      router.push(`/login?redirect=/invite/${token}`);
      return;
    }
    setAccepting(true);
    await new Promise((r) => setTimeout(r, 600));
    setAccepting(false);
    setStatus("accepted");
    setTimeout(() => router.push("/projects"), 2000);
  };

  return (
    <div className={`flex min-h-screen items-center justify-center ${pageBg} p-4`}>
      <div className="w-full max-w-md overflow-hidden rounded-3xl bg-white p-8 text-center shadow-2xl sm:p-10">
        {status === "loading" && (
          <>
            <p className="mb-4 text-5xl">⏳</p>
            <h1 className="text-2xl font-bold text-gray-800">Loading invite…</h1>
          </>
        )}

        {status === "ready" && (
          <>
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-2xl text-white">
              📋
            </div>
            <h1 className="text-2xl font-bold text-gray-800">You&apos;re invited!</h1>
            <p className="mt-2 text-sm text-gray-500">
              You have been invited to join <strong>{projectName}</strong> on TaskFlow.
            </p>

            <div className="mt-8 space-y-3">
              {!user ? (
                <>
                  <Link
                    href={`/register?redirect=/invite/${token}`}
                    className="block w-full rounded-full bg-gradient-to-r from-brand-600 to-brand-500 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-500/30"
                  >
                    Create an account to accept
                  </Link>
                  <Link
                    href={`/login?redirect=/invite/${token}`}
                    className="block w-full rounded-full bg-gray-100 py-3 text-sm font-semibold text-gray-600"
                  >
                    Sign in to accept
                  </Link>
                </>
              ) : (
                <button
                  onClick={handleAccept}
                  disabled={accepting}
                  className="w-full rounded-full bg-gradient-to-r from-brand-600 to-brand-500 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-500/30 disabled:opacity-60"
                >
                  {accepting ? "Accepting…" : `Accept invite as ${user.name}`}
                </button>
              )}
            </div>
          </>
        )}

        {status === "accepted" && (
          <>
            <p className="mb-4 text-5xl">🎉</p>
            <h1 className="text-2xl font-bold text-gray-800">Welcome aboard!</h1>
            <p className="mt-2 text-sm text-gray-400">You&apos;ve joined {projectName}. Redirecting to your projects…</p>
          </>
        )}

        {status === "error" && (
          <>
            <p className="mb-4 text-5xl">⚠️</p>
            <h1 className="text-2xl font-bold text-gray-800">Invalid invite</h1>
            <p className="mt-2 text-sm text-gray-400">This invite link is invalid or has expired.</p>
            <Link href="/dashboard" className="mt-6 block text-sm font-semibold text-brand-600 hover:text-brand-700">
              Go to dashboard
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
