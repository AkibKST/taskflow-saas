"use client";
import { useState, FormEvent } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { parseApiError } from "@/lib/apiError";
import { showToast } from "@/store/toastStore";
import { useAuthStore } from "@/store/authStore";
import AppHeader from "@/components/layout/AppHeader";
import { Card, SectionHeader } from "@/components/ui";
import { btnPrimary, cx, pageBg } from "@/lib/ui";

const inputClass =
  "w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-800 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-500/30";

export default function AccountSettingsPage() {
  const { user } = useAuthStore();

  const [profileForm, setProfileForm] = useState({
    name: user?.name ?? "",
    email: user?.email ?? "",
  });
  const [profileSaving, setProfileSaving] = useState(false);

  const [pwForm, setPwForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [pwSaving, setPwSaving] = useState(false);
  const [pwError, setPwError] = useState("");

  const handleProfileSave = async (e: FormEvent) => {
    e.preventDefault();
    setProfileSaving(true);
    try {
      await api.patch("/auth/me", {
        name: profileForm.name.trim(),
        email: profileForm.email.trim(),
      });
      showToast("Profile updated", "success");
    } catch (err) {
      showToast(parseApiError(err).message, "error");
    } finally {
      setProfileSaving(false);
    }
  };

  const handlePasswordSave = async (e: FormEvent) => {
    e.preventDefault();
    setPwError("");
    if (pwForm.newPassword !== pwForm.confirmPassword) {
      setPwError("Passwords do not match.");
      return;
    }
    if (pwForm.newPassword.length < 8) {
      setPwError("New password must be at least 8 characters.");
      return;
    }
    setPwSaving(true);
    try {
      await api.patch("/auth/me/password", {
        currentPassword: pwForm.currentPassword,
        newPassword: pwForm.newPassword,
      });
      showToast("Password changed", "success");
      setPwForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (err) {
      showToast(parseApiError(err).message, "error");
    } finally {
      setPwSaving(false);
    }
  };

  return (
    <div className={cx("min-h-screen", pageBg)}>
      <AppHeader />

      <main className="mx-auto max-w-2xl px-6 py-8">
        <h1 className="mb-6 text-2xl font-bold text-gray-900">Account settings</h1>

        <Card className="mb-6">
          <SectionHeader title="Profile" />
          <form onSubmit={handleProfileSave} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-600">Full name</label>
              <input
                className={inputClass}
                value={profileForm.name}
                onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-600">Email</label>
              <input
                type="email"
                className={inputClass}
                value={profileForm.email}
                onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                required
              />
            </div>
            <p className="text-xs text-gray-500">
              Note: changing your email requires re-verification on some plans.
            </p>
            <button type="submit" disabled={profileSaving} className={btnPrimary}>
              {profileSaving ? "Saving…" : "Save profile"}
            </button>
          </form>
        </Card>

        <Card className="mb-6">
          <SectionHeader title="Change password" />
          <form onSubmit={handlePasswordSave} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-600">Current password</label>
              <input
                type="password"
                className={inputClass}
                value={pwForm.currentPassword}
                onChange={(e) => setPwForm({ ...pwForm, currentPassword: e.target.value })}
                required
                autoComplete="current-password"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-600">New password</label>
              <input
                type="password"
                className={inputClass}
                value={pwForm.newPassword}
                onChange={(e) => setPwForm({ ...pwForm, newPassword: e.target.value })}
                required
                minLength={8}
                autoComplete="new-password"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-600">Confirm new password</label>
              <input
                type="password"
                className={inputClass}
                value={pwForm.confirmPassword}
                onChange={(e) => setPwForm({ ...pwForm, confirmPassword: e.target.value })}
                required
                autoComplete="new-password"
              />
            </div>
            {pwError && <p className="text-xs font-medium text-rose-600">{pwError}</p>}
            <button type="submit" disabled={pwSaving} className={btnPrimary}>
              {pwSaving ? "Changing…" : "Change password"}
            </button>
          </form>
        </Card>

        <Card>
          <SectionHeader title="More settings" />
          <ul className="space-y-2">
            <li>
              <Link
                href="/settings/notifications"
                className="flex items-center justify-between rounded-xl px-3 py-3 text-sm text-gray-700 hover:bg-gray-50"
              >
                <span>Notification preferences</span>
                <svg className="h-4 w-4 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m9 18 6-6-6-6" />
                </svg>
              </Link>
            </li>
          </ul>
        </Card>
      </main>
    </div>
  );
}
