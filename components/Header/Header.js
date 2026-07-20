"use client";

import styles from "./Header.module.css";
import Link from "next/link";

export default function Header() {
  return (
    <header className={styles.header}>
      <div className={styles.left}>
        <Link href="/" style={{ textDecoration: "none" }}>
          <span className={styles.title}>Ranking de Candidatos</span>
        </Link>
        <span className={styles.subtitle}>Sistema de distribuicao inteligente</span>
      </div>
      <span className={styles.badge}>Prototipo</span>
    </header>
  );
}
