"use client";

import styles from "./Header.module.css";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function Header() {
  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  return (
    <header className={styles.header}>
      <Link href="/" className={styles.brand}>
        <div className={styles.logoCircle}>
          <img src="/logo-ct.svg" alt="CT" className={styles.logoImg} />
        </div>
        <div className={styles.brandText}>
          <span className={styles.title}>Ranking de Candidatos</span>
          <span className={styles.subtitle}>Cia de Talentos</span>
        </div>
      </Link>
      <button className={styles.logoutBtn} onClick={handleLogout}>
        Sair
      </button>
    </header>
  );
}
