import "./globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "@/components/ui/Toaster";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    default: "TaskFlow",
    template: "%s · TaskFlow",
  },
  description:
    "Collaborative task management — projects, Kanban boards, real-time collaboration and your whole team in one place.",
  openGraph: {
    siteName: "TaskFlow",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-gray-50 text-gray-900 antialiased`}>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
