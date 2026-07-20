"use client";

import "./globals.css";
import { ToastProvider } from "@/lib/useToast";
import Header from "@/components/Header/Header";
import Toast from "@/components/Toast/Toast";

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <head>
        <title>Ranking de Candidatos</title>
        <meta name="description" content="Sistema de distribuicao inteligente de candidatos" />
      </head>
      <body>
        <ToastProvider>
          <Header />
          <Toast />
          <main style={{ padding: "24px 28px", maxWidth: 1400, margin: "0 auto" }}>
            {children}
          </main>
        </ToastProvider>
      </body>
    </html>
  );
}
