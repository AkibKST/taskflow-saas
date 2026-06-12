import "./globals.css";
import { Toaster } from "@/components/ui/Toaster";

export const metadata = {
  title: "TaskFlow",
  description: "Collaborative task management SaaS",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-50 text-gray-900 antialiased">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
