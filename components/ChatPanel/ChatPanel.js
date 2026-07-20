"use client";

import { useState, useRef, useEffect } from "react";
import styles from "./ChatPanel.module.css";

const SUGGESTIONS = [
  "Quais colunas estao disponiveis?",
  "Priorizar candidatos por experiencia",
  "Definir peso para formacao",
  "Mostrar regras atuais",
];

function renderMarkdown(text) {
  if (!text) return "";
  return text.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>").replace(/\n- /g, "\n&#8226; ").replace(/\n/g, "<br/>");
}

export default function ChatPanel({ messages = [], onSend, isLoading, regras = [] }) {
  const [input, setInput] = useState("");
  const bottomRef = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, isLoading]);

  function send(text) {
    const msg = text || input.trim();
    if (!msg) return;
    onSend(msg);
    setInput("");
  }

  function handleKey(e) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  }

  const isEmpty = messages.length === 0;

  return (
    <div className={styles.panel}>
      {regras.length > 0 && (
        <div className={styles.regrasBar}>
          {regras.map((r, i) => (
            <span key={i} className={styles.regraBadge}>
              {typeof r === "string" ? r : r.descricao || r.regra || JSON.stringify(r)}
            </span>
          ))}
        </div>
      )}
      <div className={styles.messages}>
        {isEmpty && (
          <>
            <div className={styles.welcome}>Ola! Sou seu assistente de ranking. Como posso ajudar?</div>
            <div className={styles.suggestions}>
              {SUGGESTIONS.map((s) => (<button key={s} className={styles.suggestion} onClick={() => send(s)}>{s}</button>))}
            </div>
          </>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`${styles.bubble} ${m.role === "user" ? styles.user : styles.assistant}`}
            dangerouslySetInnerHTML={{ __html: renderMarkdown(m.content || m.message || m.texto || "") }} />
        ))}
        {isLoading && (<div className={styles.typing}><span className={styles.dot} /><span className={styles.dot} /><span className={styles.dot} /></div>)}
        <div ref={bottomRef} />
      </div>
      <div className={styles.inputBar}>
        <input className={`input ${styles.inputField}`} placeholder="Digite sua mensagem..." value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKey} disabled={isLoading} />
        <button className={`btn btn-primary btn-sm ${styles.sendBtn}`} onClick={() => send()} disabled={isLoading || !input.trim()}>Enviar</button>
      </div>
    </div>
  );
}
