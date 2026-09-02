'use client';

import { useRef, useState } from 'react';
import styles from './UploadArea.module.css';

const ACCEPTED = '.xlsx,.xls,.csv';

export default function UploadArea({ onUpload, isLoading, progress = null }) {
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
      {isLoading && (
        <div style={{ marginTop: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 10 }}>
            <span className={styles.spinner} style={{ borderTopColor: '#EE222B', borderColor: '#f2c6c8', borderTopWidth: 3 }} />
            <span style={{ fontWeight: 600, color: '#EE222B', fontSize: '0.9rem' }}>
              {progress == null || progress >= 100 ? 'Carregando arquivo...' : `Carregando... ${progress}%`}
            </span>
          </div>
          <div
            style={{
              height: 8,
              background: '#eee',
              borderRadius: 999,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                height: '100%',
                width: progress == null ? '100%' : `${progress}%`,
                background: '#EE222B',
                borderRadius: 999,
                transition: 'width 0.2s ease',
                animation: progress == null ? 'ct-indeterminate 1.2s infinite' : 'none',
              }}
            />
          </div>
          <p style={{ margin: '8px 0 0', fontSize: '0.78rem', color: '#888', textAlign: 'center' }}>
            {progress == null
              ? 'Lendo e enviando a planilha, aguarde...'
              : progress < 100
              ? 'Enviando o arquivo...'
              : 'Processando no servidor...'}
          </p>
        </div>
      )}
      <button
        className={styles.uploadBtn}
        onClick={handleUpload}
        disabled={!file || isLoading}
      >
        {isLoading ? <span className={styles.spinner} /> : 'Enviar arquivo'}
      </button>
      <style jsx>{`
        @keyframes ct-indeterminate {
          0% { opacity: 0.5; }
          50% { opacity: 1; }
          100% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}
