"use client";

import { useToast } from "@/lib/useToast";
import styles from "./Toast.module.css";

export default function Toast() {
  const { toasts, removeToast } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div className={styles.container}>
      {toasts.map((t) => (
        <div key={t.id} className={`${styles.toast} ${styles[t.type] || ""}`}>
          <span className={styles.message}>{t.message}</span>
          <button className={styles.close} onClick={() => removeToast(t.id)} aria-label="Fechar">x</button>
        </div>
      ))}
    </div>
  );
}
