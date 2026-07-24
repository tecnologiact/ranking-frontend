'use client';

import { useRef, useState } from 'react';
import styles from './UploadArea.module.css';

const ACCEPTED = '.xlsx,.xls,.csv';

export default function UploadArea({ onUpload, isLoading }) {
  const inputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [dragOver, setDragOver] = useState(false);

  function handleFile(f) {
    if (f) setFile(f);
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) handleFile(f);
  }

  function handleChange(e) {
    handleFile(e.target.files?.[0]);
  }

  function handleUpload() {
    if (file && onUpload) onUpload(file);
  }

  return (
    <div className={styles.wrapper}>
      <div
        className={`${styles.dropzone} ${dragOver ? styles.dragOver : ''}`}
        onDrop={handleDrop}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED}
          onChange={handleChange}
          className={styles.hiddenInput}
        />
        <div className={styles.icon}>&#128194;</div>
        {file ? (
          <p className={styles.fileName}>{file.name}</p>
        ) : (
          <>
            <p className={styles.label}>Arraste e solte seu arquivo aqui</p>
            <p className={styles.hint}>ou clique para selecionar (.xlsx, .xls, .csv)</p>
          </>
        )}
      </div>
      <button
        className={styles.uploadBtn}
        onClick={handleUpload}
        disabled={!file || isLoading}
      >
        {isLoading ? <span className={styles.spinner} /> : 'Enviar arquivo'}
      </button>
    </div>
  );
}
