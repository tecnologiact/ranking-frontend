'use client';

import { useRef, useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import styles from './ChatPanel.module.css';

export default function ChatPanel({ messages = [], onSend, isLoading, regras = [] }) {
  const [input, setInput] = useState('');
  const messagesRef = useRef(null);

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

  function handleStart() {
    if (!isLoading) onSend?.('Quero iniciar. Faça uma leitura e análise da base que eu anexei na etapa anterior.');
  }

  const hasMessages = messages.length > 0;

  return (
    <div className={styles.panel}>
      {/* Messages area */}
      <div className={styles.messages} ref={messagesRef}>
        {!hasMessages && !isLoading ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>&#128172;</div>
            <div className={styles.emptyTitle}>Pronto para configurar o ranking</div>
            <div className={styles.emptyText}>
              Clique no botão abaixo para o assistente analisar sua base de candidatos e iniciar a configuração das regras de distribuição.
            </div>
            <button
              className={styles.startBtn}
              onClick={handleStart}
              disabled={isLoading}
            >
              Iniciar análise da base
            </button>
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

      {/* Input bar - only show after conversation started */}
      {hasMessages && (
        <div className={styles.inputBar}>
          <input
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
      )}
    </div>
  );
}
