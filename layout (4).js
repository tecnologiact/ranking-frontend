"use client";

import "./globals.css";
import { usePathname } from "next/navigation";
import { ToastProvider } from "@/lib/useToast";
import Header from "@/components/Header/Header";
import Toast from "@/components/Toast/Toast";

export default function RootLayout({ children }) {
  const pathname = usePathname();
  const isLogin = pathname === "/login";

  return (
    <html lang="pt-BR">
      <head>
        <title>Ranking de Candidatos | Cia de Talentos</title>
        <meta name="description" content="Ranking de Candidatos - Cia de Talentos" />
      </head>
      <body>
        <ToastProvider>
          {isLogin ? (
            <>
              {children}
              <Toast />
            </>
          ) : (
            <>
              <Header />
              <main style={{
                maxWidth: 1200,
                margin: "0 auto",
                padding: "32px 24px",
              }}>
                {children}
              </main>
              <Toast />
            </>
          )}
        </ToastProvider>
      </body>
    </html>
  );
}
