import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Inter } from "next/font/google";
import "./globals.css";
import { RepositoryProvider } from "../lib/repository/RepositoryProvider";
import { ToastProvider } from "../components/ui/Toast";
import { AuthProvider } from "../lib/auth/AuthContext";
import { RootShell } from "../components/shell/RootShell";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-jakarta",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "RevenueOS — CRM",
  description: "RevenueOS CRM module of the Texzium ERP",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${jakarta.variable} ${inter.variable}`}>
      <body>
        <AuthProvider>
          <RepositoryProvider>
            <ToastProvider>
              <RootShell>{children}</RootShell>
            </ToastProvider>
          </RepositoryProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
