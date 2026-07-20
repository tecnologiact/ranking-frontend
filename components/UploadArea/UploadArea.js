"use client";

import { useRef, useState } from "react";
import styles from "./UploadArea.module.css";

const ACCEPTED = ".xlsx,.xls,.csv";

export default function UploadArea({ onUpload, isLoading }) {
  const inputRef = useRef(null);
  const [dragover, setDragover] = useState(false);

  function handleDrop(e) {
    e.preventDefault();
    setDragover(false);
    const file = e.dataTransfer.files?.[0];
    if (file) onUpload(file);
  }

  function handleChange(e) {
    const file = e.target.files?.[0];
    if (file) onUpload(file);
    e.target.value = "";
  }

  if (isLoading) {
    return (
      <div className={styles.loading}>
        <span className="spinner" />
        <span className={styles.loadingText}>Enviando arquivo...</span>
      </div>
    );
  }

  return (
    <div
      className={`${styles.zone} ${dragover ? styles.dragover : ""}`}
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setDragover(true); }}
      onDragLeave={() => setDragover(false)}
      onDrop={handleDrop}
    >
      <span className={styles.icon}>&#128194;</span>
      <span className={styles.label}>Arraste e solte sua planilha aqui ou clique para selecionar</span>
      <span className={styles.hint}>Formatos aceitos: .xlsx, .xls, .csv</span>
      <input ref={inputRef} type="file" accept={ACCEPTED} onChange={handleChange} className={styles.hidden} />
    </div>
  );
}
