"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  listarUploads,
  uploadArquivo,
  deletarUpload,
  obterRegras,
  enviarMensagemChat,
  rodarRanking,
} from "@/lib/api";
import { useToast } from "@/lib/useToast";
import UploadArea from "@/components/UploadArea/UploadArea";
import ChatPanel from "@/components/ChatPanel/ChatPanel";

const REGRAS_META_KEYS = [
  "upload_id",
  "processo_id",
  "processo",
  "slug",
  "id",
  "created_at",
  "updated_at",
  "atualizado_em",
];

const PCT_KEY_HINT = /pct|percent|cota|proporcao|propor[cç][aã]o|taxa/i;

function formatRegraValor(chave, valor) {
  if (
    typeof valor === "number" &&
    valor >= 0 &&
    valor <= 1 &&
    PCT_KEY_HINT.test(chave)
  ) {
    return `${(valor * 100).toFixed(0)}%`;
  }
  return String(valor);
}

function flattenRegrasObject(obj) {
  const entries = Object.entries(obj || {}).filter(
    ([k, v]) => !REGRAS_META_KEYS.includes(k) && v !== null && v !== undefined
  );
  const result = [];
  for (const [k, v] of entries) {
    if (typeof v === "object" && !Array.isArray(v)) {
      result.push(...flattenRegrasObject(v));
    } else {
      result.push({ descricao: `${k.replace(/_/g, " ")}: ${formatRegraValor(k, v)}` });
    }
  }
  return result;
}

function normalizeRegras(data) {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.regras)) return data.regras;
  if (typeof data === "object") return flattenRegrasObject(data);
  return [];
}

const CHAT_HISTORY_TTL_MS = 15 * 24 * 60 * 60 * 1000;

function chatHistoryKey(slug, uploadId) {
  return `chat_history_${slug}_${uploadId}`;
}

function loadChatHistory(slug, uploadId) {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(chatHistoryKey(slug, uploadId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.savedAt || Date.now() - parsed.savedAt > CHAT_HISTORY_TTL_MS) {
      window.localStorage.removeItem(chatHistoryKey(slug, uploadId));
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function saveChatHistory(slug, uploadId, { messages, chatId }) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      chatHistoryKey(slug, uploadId),
      JSON.stringify({ messages, chatId, savedAt: Date.now() })
    );
  } catch {}
}

export default function ProcessoPage({ params }) {
  const { slug } = params;
  const router = useRouter();
  const { addToast } = useToast();

  const [uploads, setUploads] = useState([]);
  const [activeUpload, setActiveUpload] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [loadingPage, setLoadingPage] = useState(true);

  // Chat
  const [chatId, setChatId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [chatLoading, setChatLoading] = useState(false);

  // Regras
  const [regras, setRegras] = useState([]);

  // Ranking
  const [rankingLoading, setRankingLoading] = useState(false);
  const [cenario, setCenario] = useState("C");

  // Vagas from upload
  const [vagas, setVagas] = useState([]);

  async function fetchUploads() {
    try {
      const data = await listarUploads(slug);
      const list = Array.isArray(data) ? data : [];
      setUploads(list);
    } catch (err) {
      addToast(err.message, "error");
    } finally {
      setLoadingPage(false);
    }
  }

  useEffect(() => {
    fetchUploads();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  useEffect(() => {
    if (!activeUpload) return;
    const uploadId = activeUpload.id || activeUpload.upload_id;
    obterRegras(slug, uploadId)
      .then((data) => setRegras(normalizeRegras(data)))
      .catch(() => {});

    const historico = loadChatHistory(slug, uploadId);
    if (historico) {
      setMessages(historico.messages || []);
      setChatId(historico.chatId || null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeUpload]);

  useEffect(() => {
    if (!activeUpload || messages.length === 0) return;
    const uploadId = activeUpload.id || activeUpload.upload_id;
    saveChatHistory(slug, uploadId, { messages, chatId });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, chatId]);

  async function handleUpload(file) {
    try {
      setUploading(true);
      const result = await uploadArquivo(slug, file);
      addToast("Arquivo enviado com sucesso!", "success");
      setActiveUpload(result);
      if (result.vagas) setVagas(result.vagas);
      await fetchUploads();
    } catch (err) {
      addToast(err.message, "error");
    } finally {
      setUploading(false);
    }
  }

  async function handleDeleteUpload(uploadId) {
    if (!confirm("Excluir este upload?")) return;
    try {
      await deletarUpload(uploadId);
      addToast("Upload excluido.", "success");
      if (typeof window !== "undefined") {
        window.localStorage.removeItem(chatHistoryKey(slug, uploadId));
      }
      if (
        activeUpload &&
        (activeUpload.id === uploadId || activeUpload.upload_id === uploadId)
      ) {
        setActiveUpload(null);
        setMessages([]);
        setChatId(null);
        setRegras([]);
        setVagas([]);
      }
      await fetchUploads();
    } catch (err) {
      addToast(err.message, "error");
    }
  }

  async function handleSendChat(mensagem) {
    const uploadId = activeUpload?.id || activeUpload?.upload_id;
    setMessages((prev) => [...prev, { role: "user", content: mensagem }]);
    try {
      setChatLoading(true);
      const res = await enviarMensagemChat(slug, {
        mensagem,
        chat_id: chatId,
        upload_id: uploadId,
      });
      if (res?.chat_id) setChatId(res.chat_id);
      const resposta =
        res?.resposta || res?.mensagem || res?.message || res?.content || "";
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: resposta },
      ]);
      if (res?.vagas) setVagas(res.vagas);
      try {
        const regrasAtualizadas = await obterRegras(slug, uploadId);
        setRegras(normalizeRegras(regrasAtualizadas));
      } catch (regrasErr) {
        console.error("Falha ao buscar regras:", regrasErr);
      }
    } catch (err) {
      addToast(err.message, "error");
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Desculpe, ocorreu um erro ao processar sua mensagem.",
        },
      ]);
    } finally {
      setChatLoading(false);
    }
  }

  async function handleRanking() {
    const uploadId = activeUpload?.id || activeUpload?.upload_id;
    if (!uploadId) return;
    try {
      setRankingLoading(true);
      await rodarRanking(slug, uploadId, cenario);
      addToast("Ranking executado com sucesso!", "success");
      router.push(`/processos/${slug}/resultado/${uploadId}`);
    } catch (err) {
      addToast(err.message, "error");
    } finally {
      setRankingLoading(false);
    }
  }

  if (loadingPage) {
    return (
      <div style={{ textAlign: "center", padding: 60 }}>
        <span className="spinner" />
      </div>
    );
  }

  // No active upload state
  if (!activeUpload) {
    return (
      <div>
        <button
          className="btn btn-sm"
          onClick={() => router.push("/")}
          style={{ marginBottom: 16 }}
        >
          &larr; Voltar aos processos
        </button>

        <h1 style={{ fontSize: "1.3rem", marginBottom: 6 }}>
          Processo:{" "}
          <span style={{ color: "#EE222B" }}>{slug}</span>
        </h1>
        <p style={{ color: "#888", fontSize: "0.85rem", marginBottom: 20 }}>
          Faça upload da planilha de candidatos (.xlsx, .xls ou .csv) para iniciar a configuração do ranking.
        </p>

        {/* Step indicator */}
        <div style={{ display: "flex", gap: 0, marginBottom: 24, fontSize: "0.8rem" }}>
          {["Upload da planilha", "Configurar regras", "Executar ranking", "Exportar relatório"].map((step, i) => (
            <div key={i} style={{ flex: 1, display: "flex", alignItems: "center" }}>
              <div style={{
                width: 28, height: 28, borderRadius: "50%",
                background: i === 0 ? "#EE222B" : "#e0e0e0",
                color: i === 0 ? "#fff" : "#888",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontWeight: 600, fontSize: "0.8rem", flexShrink: 0,
              }}>{i + 1}</div>
              <span style={{ marginLeft: 6, color: i === 0 ? "#333" : "#aaa", whiteSpace: "nowrap" }}>{step}</span>
              {i < 3 && <div style={{ flex: 1, height: 1, background: "#e0e0e0", margin: "0 8px" }} />}
            </div>
          ))}
        </div>

        <UploadArea onUpload={handleUpload} isLoading={uploading} />

        {uploads.length > 0 && (
          <div style={{ marginTop: 28 }}>
            <h2
              style={{
                fontSize: "1rem",
                marginBottom: 12,
                color: "#666",
              }}
            >
              Uploads anteriores
            </h2>
            <div
              style={{ display: "flex", flexDirection: "column", gap: 8 }}
            >
              {uploads.map((u) => {
                const uid = u.id || u.upload_id;
                return (
                  <div
                    key={uid}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "12px 16px",
                      background: "#fff",
                      border: "1px solid #e0e0e0",
                      borderRadius: 10,
                    }}
                  >
                    <div>
                      <span style={{ fontWeight: 500, marginRight: 12 }}>
                        {u.filename || u.nome || uid}
                      </span>
                      <span style={{ fontSize: "0.8rem", color: "#999" }}>
                        {u.created_at
                          ? new Date(u.created_at).toLocaleString("pt-BR")
                          : ""}
                      </span>
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        onClick={() => {
                          setActiveUpload(u);
                          if (u.vagas) setVagas(u.vagas);
                        }}
                        style={{
                          padding: "6px 14px",
                          fontSize: "0.85rem",
                          fontWeight: 600,
                          border: "none",
                          borderRadius: 6,
                          cursor: "pointer",
                          background: "#EE222B",
                          color: "#fff",
                        }}
                      >
                        Continuar
                      </button>
                      <button
                        onClick={() => handleDeleteUpload(uid)}
                        style={{
                          padding: "6px 14px",
                          fontSize: "0.85rem",
                          fontWeight: 600,
                          border: "1px solid #ccc",
                          borderRadius: 6,
                          cursor: "pointer",
                          background: "#fff",
                          color: "#333",
                        }}
                      >
                        Excluir
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Active upload state
  const uploadId = activeUpload?.id || activeUpload?.upload_id;

  return (
    <div>
      {/* Step indicator - step 2 active */}
      <div style={{ display: "flex", gap: 0, marginBottom: 20, fontSize: "0.8rem" }}>
        {["Upload da planilha", "Configurar regras", "Executar ranking", "Exportar relatório"].map((step, i) => (
          <div key={i} style={{ flex: 1, display: "flex", alignItems: "center" }}>
            <div style={{
              width: 28, height: 28, borderRadius: "50%",
              background: i <= 1 ? "#EE222B" : "#e0e0e0",
              color: i <= 1 ? "#fff" : "#888",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontWeight: 600, fontSize: "0.8rem", flexShrink: 0,
            }}>{i === 0 ? "✓" : i + 1}</div>
            <span style={{ marginLeft: 6, color: i <= 1 ? "#333" : "#aaa", whiteSpace: "nowrap" }}>{step}</span>
            {i < 3 && <div style={{ flex: 1, height: 1, background: i < 1 ? "#EE222B" : "#e0e0e0", margin: "0 8px" }} />}
          </div>
        ))}
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 20,
        }}
      >
        <div>
          <h1 style={{ fontSize: "1.3rem" }}>
            Processo:{" "}
            <span style={{ color: "#EE222B" }}>{slug}</span>
          </h1>
          <span style={{ fontSize: "0.8rem", color: "#999" }}>
            Arquivo: {activeUpload.filename || activeUpload.nome || uploadId}
          </span>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={() => {
              setActiveUpload(null);
              setMessages([]);
              setChatId(null);
              setRegras([]);
              setVagas([]);
            }}
            style={{
              padding: "8px 16px",
              fontSize: "0.85rem",
              fontWeight: 500,
              border: "1px solid #ccc",
              borderRadius: 8,
              cursor: "pointer",
              background: "#fff",
              color: "#333",
            }}
          >
            Trocar arquivo
          </button>
        </div>
      </div>

      <div style={{ display: "flex", gap: 20, alignItems: "flex-start", height: "calc(100vh - 220px)", minHeight: 480 }}>
        {/* Left: Summary panel */}
        <div style={{ flex: "0 0 38%", minWidth: 0, height: "100%", overflowY: "auto", paddingRight: 4 }}>
          <h3 style={{ fontSize: "0.85rem", color: "#888", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.04em" }}>
            Resumo da configuração
          </h3>

          {/* Upload info card */}
          <div style={{
            background: "#fff",
            border: "1px solid #e5e5e7",
            borderRadius: 10,
            padding: "16px 18px",
            marginBottom: 12,
          }}>
            <div style={{ fontSize: "0.75rem", color: "#888", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 8 }}>
              Arquivo carregado
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: "1.2rem" }}>&#128196;</span>
              <div>
                <div style={{ fontWeight: 600, fontSize: "0.85rem" }}>
                  {activeUpload.filename || activeUpload.nome || "Planilha"}
                </div>
                {activeUpload.created_at && (
                  <div style={{ fontSize: "0.75rem", color: "#999" }}>
                    {new Date(activeUpload.created_at).toLocaleString("pt-BR")}
                  </div>
                )}
              </div>
            </div>
            {(activeUpload.total_candidatos || activeUpload.total_vagas) && (
              <div style={{ display: "flex", gap: 12, marginTop: 10 }}>
                {activeUpload.total_candidatos != null && (
                  <div style={{
                    flex: 1, textAlign: "center", padding: "8px 0",
                    background: "#f7f7f8", borderRadius: 8,
                  }}>
                    <div style={{ fontSize: "1.1rem", fontWeight: 700 }}>{activeUpload.total_candidatos}</div>
                    <div style={{ fontSize: "0.7rem", color: "#888" }}>candidatos</div>
                  </div>
                )}
                {activeUpload.total_vagas != null && (
                  <div style={{
                    flex: 1, textAlign: "center", padding: "8px 0",
                    background: "#f7f7f8", borderRadius: 8,
                  }}>
                    <div style={{ fontSize: "1.1rem", fontWeight: 700 }}>{activeUpload.total_vagas}</div>
                    <div style={{ fontSize: "0.7rem", color: "#888" }}>vagas</div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Rules configured */}
          <div style={{
            background: "#fff",
            border: "1px solid #e5e5e7",
            borderRadius: 10,
            padding: "16px 18px",
            marginBottom: 12,
          }}>
            <div style={{ fontSize: "0.75rem", color: "#888", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 10 }}>
              Regras definidas
            </div>
            {regras.length === 0 ? (
              <div style={{ fontSize: "0.82rem", color: "#aaa", lineHeight: 1.6 }}>
                <p style={{ margin: "0 0 6px" }}>Nenhuma regra configurada ainda.</p>
                <p style={{ margin: 0 }}>Use o chat ao lado para definir os pesos e cotas do processo. Exemplos:</p>
                <ul style={{ margin: "6px 0 0", paddingLeft: 18, color: "#999", fontSize: "0.78rem" }}>
                  <li>"Definir cota de gênero mínima de 4"</li>
                  <li>"50% mulheres em cada vaga"</li>
                  <li>"Cota de localidade 30%"</li>
                </ul>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {regras.map((r, i) => {
                  const texto = typeof r === "string" ? r : r.descricao || r.regra || "";
                  const chave = typeof r === "object" && !r.descricao ? Object.entries(r).map(([k, v]) => `${k.replace(/_/g, " ")}: ${v}`).join(", ") : "";
                  return (
                    <div key={i} style={{
                      display: "flex", alignItems: "center", gap: 8,
                      padding: "8px 12px",
                      background: "#f0faf0",
                      border: "1px solid #d0e8d0",
                      borderRadius: 8,
                      fontSize: "0.82rem",
                    }}>
                      <span style={{ color: "#00a85c", fontWeight: 700 }}>&#10003;</span>
                      <span style={{ color: "#2a5a2a" }}>{texto || chave || JSON.stringify(r)}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Scenario selection */}
          <div style={{
            background: "#fff",
            border: "1px solid #e5e5e7",
            borderRadius: 10,
            padding: "16px 18px",
            marginBottom: 12,
          }}>
            <div style={{ fontSize: "0.75rem", color: "#888", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 10 }}>
              Cenário para executar
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              {[
                { key: "A", label: "A · Tier-locked" },
                { key: "B", label: "B · Pool misto" },
                { key: "C", label: "C · Intermediário" },
              ].map((opt) => (
                <button
                  key={opt.key}
                  onClick={() => setCenario(opt.key)}
                  style={{
                    flex: 1,
                    padding: "8px 6px",
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    border: cenario === opt.key ? "1px solid #EE222B" : "1px solid #ddd",
                    borderRadius: 8,
                    cursor: "pointer",
                    background: cenario === opt.key ? "#fde8e9" : "#fff",
                    color: cenario === opt.key ? "#EE222B" : "#666",
                    transition: "all 0.15s",
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <p style={{ margin: "8px 0 0", fontSize: "0.72rem", color: "#999" }}>
              Escolha 1 cenário por vez para rodar o ranking.
            </p>
          </div>

          {/* Readiness checklist */}
          <div style={{
            background: "#fff",
            border: "1px solid #e5e5e7",
            borderRadius: 10,
            padding: "16px 18px",
            marginBottom: 12,
          }}>
            <div style={{ fontSize: "0.75rem", color: "#888", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 10 }}>
              Checklist para executar
            </div>
            {[
              { label: "Planilha carregada", done: true },
              { label: "Regras de distribuição definidas", done: regras.length > 0 },
              { label: "Pronto para gerar 3 cenários", done: regras.length > 0 },
            ].map((item, i) => (
              <div key={i} style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "6px 0",
                fontSize: "0.82rem",
                color: item.done ? "#333" : "#aaa",
              }}>
                <span style={{
                  width: 20, height: 20, borderRadius: "50%",
                  background: item.done ? "#00a85c" : "#e5e5e7",
                  color: item.done ? "#fff" : "#bbb",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "0.7rem", fontWeight: 700, flexShrink: 0,
                }}>
                  {item.done ? "✓" : i + 1}
                </span>
                <span style={{ textDecoration: item.done ? "none" : "none" }}>{item.label}</span>
              </div>
            ))}
          </div>

          {/* Execute CTA - prominent when ready */}
          <button
            onClick={handleRanking}
            disabled={rankingLoading || messages.length === 0}
            style={{
              width: "100%",
              padding: "14px 20px",
              fontSize: "0.95rem",
              fontWeight: 600,
              border: "none",
              borderRadius: 10,
              cursor: rankingLoading || messages.length === 0 ? "not-allowed" : "pointer",
              background: messages.length > 0 ? "#EE222B" : "#e0e0e0",
              color: messages.length > 0 ? "#fff" : "#999",
              opacity: rankingLoading ? 0.6 : 1,
              transition: "all 0.2s",
            }}
          >
            {rankingLoading ? "Gerando ranking..." : messages.length > 0 ? `Executar ranking (cenário ${cenario})` : "Converse com o chat para configurar"}
          </button>
        </div>

        {/* Right: Chat */}
        <div style={{ flex: "0 0 60%", minWidth: 0, height: "100%", display: "flex", flexDirection: "column" }}>
          <h3 style={{ fontSize: "0.85rem", color: "#888", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.04em", flexShrink: 0 }}>
            Chat de configuração
          </h3>
          <div style={{ flex: 1, minHeight: 0 }}>
            <ChatPanel
              messages={messages}
              onSend={handleSendChat}
              isLoading={chatLoading}
              regras={regras}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
