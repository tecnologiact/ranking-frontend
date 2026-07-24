"use client";

import { useToast } from "@/lib/useToast";
import styles from "./Toast.module.css";

export default function Toast() {
  const { toasts, removeToast } = useToast();

  if (!toasts || toasts.length === 0) return null;

  return (
    <div className={styles.container}>
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`${styles.toast} ${styles[toast.type] || styles.info}`}
        >
          <span className={styles.message}>{toast.message}</span>
          <button
            className={styles.dismiss}
            onClick={() => removeToast(toast.id)}
            aria-label="Fechar"
          >
            &times;
          </button>
        </div>
      ))}
    </div>
  );
}
