'use client';

import { useRef, useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import styles from './ChatPanel.module.css';

export default function ChatPanel({
  messages = [],
  onSend,
  isLoading,
  regras = [],
  suggestions = [],
}) {
  const [input, setInput] = useState('');
  const messagesRef = useRef(null);
  const inputRef = useRef(null);

  function handleSuggestion(s) {
    if (isLoading) return;
    if (s.fill) {
      setInput(s.prompt);
      inputRef.current?.focus();
    } else {
      onSend?.(s.prompt);
    }
  }

  useEffect(() => {
    const el = messagesRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [messages, isLoading]);

  function handleSend() {
    const text = input.trim();
    if (!text || isLoading) return;
    onSend?.(text);
    setInput('');
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  const hasMessages = messages.length > 0;

  const chipStyle = {
    padding: '6px 12px',
    fontSize: '0.78rem',
    fontWeight: 500,
    border: '1px solid #f2c6c8',
    borderRadius: 999,
    cursor: isLoading ? 'not-allowed' : 'pointer',
    background: '#fff',
    color: '#EE222B',
    whiteSpace: 'nowrap',
    opacity: isLoading ? 0.5 : 1,
  };

  return (
    <div className={styles.panel}>
      {/* Messages area */}
      <div className={styles.messages} ref={messagesRef}>
        {!hasMessages && !isLoading ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>&#128172;</div>
            <div className={styles.emptyTitle}>Converse livremente com o assistente</div>
            <div className={styles.emptyText}>
              Digite o que quiser abaixo — pedir uma análise da base, configurar regras, tirar dúvidas sobre uma coluna, o que precisar.
            </div>
            {suggestions.length > 0 && (
              <div style={{ marginTop: 18, width: '100%' }}>
                <div style={{ fontSize: '0.72rem', color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 8 }}>
                  Ou peça direto ao assistente
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center' }}>
                  {suggestions.map((s, i) => (
                    <button
                      key={i}
                      onClick={() => handleSuggestion(s)}
                      disabled={isLoading}
                      title={s.prompt}
                      style={chipStyle}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <>
            {messages.map((m, i) => (
              <div
                key={i}
                className={`${styles.bubble} ${m.role === 'user' ? styles.user : styles.assistant}`}
              >
                {m.role === 'assistant' ? (
                  <div className={styles.markdown}>
                    <ReactMarkdown>{m.content}</ReactMarkdown>
                  </div>
                ) : (
                  m.content
                )}
              </div>
            ))}
            {isLoading && (
              <div className={`${styles.bubble} ${styles.assistant}`}>
                <span className={styles.typing}>
                  <span className={styles.dot} />
                  <span className={styles.dot} />
                  <span className={styles.dot} />
                </span>
              </div>
            )}
          </>
        )}
      </div>

      {/* Rules bar */}
      {regras.length > 0 && (
        <div className={styles.rulesBar}>
          <span className={styles.rulesLabel}>Regras ativas:</span>
          {regras.map((r, i) => (
            <span key={i} className={styles.ruleBadge}>
              {typeof r === 'string' ? r : r.descricao || r.regra || JSON.stringify(r)}
            </span>
          ))}
        </div>
      )}

      {/* Suggestion chips row (after conversation started) */}
      {hasMessages && suggestions.length > 0 && (
        <div
          style={{
            display: 'flex',
            gap: 6,
            overflowX: 'auto',
            padding: '8px 4px 2px',
          }}
        >
          {suggestions.map((s, i) => (
            <button
              key={i}
              onClick={() => handleSuggestion(s)}
              disabled={isLoading}
              title={s.prompt}
              style={chipStyle}
            >
              {s.label}
            </button>
          ))}
        </div>
      )}

      {/* Input bar - sempre visível, sem prompt forçado */}
      <div className={styles.inputBar}>
          <input
            ref={inputRef}
            type="text"
            className={styles.textInput}
            placeholder="Digite sua mensagem..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
          />
        <button
          className={styles.sendBtn}
          onClick={handleSend}
          disabled={!input.trim() || isLoading}
        >
          Enviar
        </button>
      </div>
    </div>
  );
}
