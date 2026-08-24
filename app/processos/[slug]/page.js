"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  listarUploads,
  uploadArquivoComProgresso,
  deletarUpload,
  enviarMensagemChat,
  listarConversas,
  obterConversa,
  blobDaAcao,
} from "@/lib/api";
import { lerPlanilha } from "@/lib/parseExcel";
import { useToast } from "@/lib/useToast";
import UploadArea from "@/components/UploadArea/UploadArea";
import ChatPanel from "@/components/ChatPanel/ChatPanel";
import SpreadsheetViewer from "@/components/SpreadsheetViewer/SpreadsheetViewer";

// -------- persistência local (chat_id por upload) --------
const TTL_MS = 15 * 24 * 60 * 60 * 1000;
function chatIdKey(slug, uploadId) {
  return `chat_id_${slug}_${uploadId}`;
}
function saveChatId(slug, uploadId, chatId) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      chatIdKey(slug, uploadId),
      JSON.stringify({ chatId, savedAt: Date.now() })
    );
  } catch {}
}
function loadChatId(slug, uploadId) {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(chatIdKey(slug, uploadId));
    if (!raw) return null;
    const p = JSON.parse(raw);
    if (!p?.savedAt || Date.now() - p.savedAt > TTL_MS) return null;
    return p.chatId || null;
  } catch {
    return null;
  }
}

// Detecta colunas de candidatos/vagas a partir das abas já parseadas.
function detectarColunas(sheets = []) {
  const vaga = sheets.find((s) => /vaga/i.test(s.name)) || null;
  const naoVaga = sheets.filter((s) => s !== vaga);
  const cand =
    naoVaga.find((s) => /candidat|base|dados|inscri/i.test(s.name)) ||
    naoVaga.slice().sort((a, b) => b.columns.length - a.columns.length)[0] ||
    sheets[0] ||
    null;
  return {
    colunas: cand?.columns || [],
    colunasVagas: vaga?.columns || [],
  };
}

// Rótulo amigável para a aba gerada por uma ação do chat.
function rotuloAcao(acao) {
  if (acao?.tipo === "download_relatorio") {
    return `Relatório${acao.params?.cenario ? " · cenário " + acao.params.cenario : ""}`;
  }
  if (acao?.tipo === "download_planilha_enriquecida") {
    return "Planilha enriquecida";
  }
  return "Documento";
}

// Extrai descrições de cotas de qualquer payload de `dados` (pra mostrar o
// estado atual de configuração — já que /regras não existe mais).
function extrairCotas(dados) {
  const out = [];
  const visit = (obj) => {
    if (!obj || typeof obj !== "object") return;
    if (Array.isArray(obj.cotas_descricoes)) out.push(...obj.cotas_descricoes);
    for (const v of Object.values(obj)) {
      if (v && typeof v === "object") visit(v);
    }
  };
  (Array.isArray(dados) ? dados : []).forEach((d) => visit(d));
  return Array.from(new Set(out));
}

export default function ProcessoPage({ params }) {
  const { slug } = params;
  const router = useRouter();
  const { addToast } = useToast();

  const [uploads, setUploads] = useState([]);
  const [activeUpload, setActiveUpload] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(null);
  const [loadingPage, setLoadingPage] = useState(true);

  // Chat
  const [chatId, setChatId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [chatLoading, setChatLoading] = useState(false);

  // Conversas do upload
  const [conversas, setConversas] = useState([]);
  const [conversasOpen, setConversasOpen] = useState(false);

  // Documentos do viewer (planilha do upload + gerados pela IA)
  const [docs, setDocs] = useState([]);
  const [activeDocId, setActiveDocId] = useState(null);

  // Cotas/estado atual (derivado de `dados` do chat)
  const [cotas, setCotas] = useState([]);

  // Colunas detectadas (pra sugestões do chat)
  const [colunas, setColunas] = useState([]);

  const uploadId = activeUpload?.id || activeUpload?.upload_id || null;

  async function fetchUploads() {
    try {
      const data = await listarUploads(slug);
      setUploads(Array.isArray(data) ? data : []);
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

  // Ao ativar um upload: carrega conversas e retoma a última (se houver).
  useEffect(() => {
    if (!uploadId) return;
    let cancelled = false;

    (async () => {
      try {
        const lista = await listarConversas(slug, uploadId);
        if (!cancelled) setConversas(Array.isArray(lista) ? lista : []);
        const salvo = loadChatId(slug, uploadId);
        const alvo = salvo || (Array.isArray(lista) && lista[0]?.id) || null;
        if (alvo) await abrirConversa(alvo, { silencioso: true });
      } catch (e) {
        // sem conversas ainda — tudo bem
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uploadId]);

  const abrirConversa = useCallback(
    async (cId, { silencioso = false } = {}) => {
      try {
        const conv = await obterConversa(slug, cId);
        setChatId(conv.chat_id || cId);
        setMessages(Array.isArray(conv.msgs) ? conv.msgs : []);
        saveChatId(slug, uploadId, conv.chat_id || cId);
        setConversasOpen(false);
      } catch (err) {
        if (!silencioso) addToast(err.message, "error");
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [slug, uploadId]
  );

  function novaConversa() {
    setChatId(null);
    setMessages([]);
    setConversasOpen(false);
    if (uploadId && typeof window !== "undefined") {
      window.localStorage.removeItem(chatIdKey(slug, uploadId));
    }
  }

  async function handleUpload(file) {
    setUploading(true);
    setUploadProgress(0);

    // Parse do arquivo pro viewer (client-side, uma vez).
    let parsed = { sheets: [] };
    try {
      parsed = await lerPlanilha(file);
    } catch (e) {
      console.warn("Falha ao ler a planilha:", e);
    }

    try {
      const result = await uploadArquivoComProgresso(slug, file, setUploadProgress);
      const det = detectarColunas(parsed.sheets);
      setColunas(det.colunas);
      setDocs(
        parsed.sheets.length
          ? [{ id: "upload", label: file.name, kind: "upload", sheets: parsed.sheets }]
          : []
      );
      setActiveDocId(parsed.sheets.length ? "upload" : null);
      setMessages([]);
      setChatId(null);
      setCotas([]);
      addToast("Arquivo enviado com sucesso!", "success");
      setActiveUpload(result);
    } catch (err) {
      addToast(err.message, "error");
    } finally {
      setUploading(false);
      setUploadProgress(null);
      fetchUploads();
    }
  }

  async function handleDeleteUpload(uId) {
    if (!confirm("Excluir este upload?")) return;
    try {
      await deletarUpload(uId);
      addToast("Upload excluído.", "success");
      if (typeof window !== "undefined")
        window.localStorage.removeItem(chatIdKey(slug, uId));
      if (uploadId === uId) resetActive();
      fetchUploads();
    } catch (err) {
      addToast(err.message, "error");
    }
  }

  function resetActive() {
    setActiveUpload(null);
    setMessages([]);
    setChatId(null);
    setConversas([]);
    setDocs([]);
    setActiveDocId(null);
    setCotas([]);
    setColunas([]);
  }

  // Executa as ações do chat: abre cada arquivo como uma nova aba (sem baixar).
  async function executarAcoes(acoes) {
    for (let i = 0; i < (acoes?.length || 0); i++) {
      const acao = acoes[i];
      if (
        acao.tipo !== "download_relatorio" &&
        acao.tipo !== "download_planilha_enriquecida"
      ) {
        console.warn("Ação desconhecida do chat_agent:", acao);
        continue;
      }
      const docId = `acao-${Date.now()}-${i}`;
      const label = rotuloAcao(acao);
      setDocs((prev) => [
        ...prev,
        { id: docId, label, kind: "gerado", loading: true, downloadAcao: acao, sheets: [] },
      ]);
      setActiveDocId(docId);
      try {
        const blob = await blobDaAcao(acao, { baixar: false });
        const parsed = await lerPlanilha(blob);
        setDocs((prev) =>
          prev.map((d) =>
            d.id === docId ? { ...d, loading: false, sheets: parsed.sheets } : d
          )
        );
      } catch (err) {
        setDocs((prev) =>
          prev.map((d) =>
            d.id === docId ? { ...d, loading: false, error: err.message } : d
          )
        );
        // Contrato: erro de download não é silencioso.
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: `⚠️ Não consegui abrir "${label}": ${err.message}` },
        ]);
      }
    }
  }

  async function handleSendChat(mensagem) {
    setMessages((prev) => [...prev, { role: "user", content: mensagem }]);
    try {
      setChatLoading(true);
      const res = await enviarMensagemChat(slug, {
        mensagem,
        chat_id: chatId,
        upload_id: uploadId,
      });
      if (res?.chat_id) {
        setChatId(res.chat_id);
        saveChatId(slug, uploadId, res.chat_id);
      }
      const resposta =
        res?.resposta || res?.mensagem || res?.message || res?.content || "";
      setMessages((prev) => [...prev, { role: "assistant", content: resposta }]);

      const novasCotas = extrairCotas(res?.dados);
      if (novasCotas.length) setCotas(novasCotas);

      if (res?.acoes?.length) await executarAcoes(res.acoes);

      // Atualiza a lista de conversas (nova conversa recém-criada).
      listarConversas(slug, uploadId)
        .then((l) => setConversas(Array.isArray(l) ? l : []))
        .catch(() => {});
    } catch (err) {
      addToast(err.message, "error");
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Desculpe, ocorreu um erro ao processar sua mensagem." },
      ]);
    } finally {
      setChatLoading(false);
    }
  }

  async function handleDownloadDoc(doc) {
    if (!doc?.downloadAcao) return;
    try {
      await blobDaAcao(doc.downloadAcao, { baixar: true });
      addToast("Download iniciado.", "success");
    } catch (err) {
      addToast(err.message, "error");
    }
  }

  function fecharDoc(doc) {
    setDocs((prev) => {
      const restantes = prev.filter((d) => d.id !== doc.id);
      if (activeDocId === doc.id) {
        setActiveDocId(restantes[restantes.length - 1]?.id || null);
      }
      return restantes;
    });
  }

  const startMessage = useMemo(() => {
    if (!colunas.length) {
      return "Quero iniciar. Faça a leitura e análise da base que anexei e me ajude a configurar as regras.";
    }
    return `Quero iniciar. A base tem estas colunas: ${colunas.join(", ")}. Faça a leitura e análise e me ajude a configurar as regras de distribuição.`;
  }, [colunas]);

  const chatSuggestions = useMemo(
    () => [
      { label: "Analisar a base", prompt: "Analise a base que subi e me diga o que dá pra configurar.", fill: false },
      { label: "Explicar uma coluna", prompt: 'A coluna "____" da base significa ____ e deve ser usada para ____.', fill: true },
      { label: "Cotas de diversidade", prompt: "Quero definir cotas de diversidade: ____ (ex: 50% gênero, 40% pretos/pardos).", fill: true },
      { label: "Priorizar por nota", prompt: "Priorize a distribuição pela nota/score dos candidatos.", fill: false },
      { label: "Repescagem", prompt: "Configure a repescagem: considerar a 1ª opção de vaga, depois a 2ª, aplicando os critérios do ranking antes de redirecionar.", fill: true },
      { label: "Pesos dos assessments", prompt: "Os pesos dos assessments para a média ponderada devem ser: ____.", fill: true },
      { label: "Rodar e mostrar", prompt: "Rode o ranking e me mostre o resultado como uma aba na planilha.", fill: false },
      { label: "Estudo de flexibilização", prompt: "Faça um estudo de flexibilização: quantas pessoas reprovaram só por pré-requisito, quantas ficaram de fora por uma única regra, e quais regras mais restringem o preenchimento das vagas.", fill: false },
      { label: "Baixar planilha enriquecida", prompt: "Gere e me mostre a planilha enriquecida com as colunas calculadas.", fill: false },
    ],
    []
  );

  if (loadingPage) {
    return (
      <div style={{ textAlign: "center", padding: 60 }}>
        <span className="spinner" />
      </div>
    );
  }

  // -------- Tela de upload (sem upload ativo) --------
  if (!activeUpload) {
    return (
      <div>
        <button className="btn btn-sm" onClick={() => router.push("/")} style={{ marginBottom: 16 }}>
          &larr; Voltar aos processos
        </button>
        <h1 style={{ fontSize: "1.3rem", marginBottom: 6 }}>
          Processo: <span style={{ color: "#EE222B" }}>{slug}</span>
        </h1>
        <p style={{ color: "#888", fontSize: "0.85rem", marginBottom: 20 }}>
          Suba a planilha de candidatos (.xlsx, .xls ou .csv). Ela abre ao lado do
          chat, e a IA vai gerando o ranking e as análises como novas abas.
        </p>

        <UploadArea onUpload={handleUpload} isLoading={uploading} progress={uploadProgress} />

        {uploads.length > 0 && (
          <div style={{ marginTop: 28 }}>
            <h2 style={{ fontSize: "1rem", marginBottom: 12, color: "#666" }}>Uploads anteriores</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {uploads.map((u) => {
                const uid = u.id || u.upload_id;
                return (
                  <div key={uid} style={rowCard}>
                    <div>
                      <span style={{ fontWeight: 500, marginRight: 12 }}>
                        {u.filename || u.arquivo_nome || u.nome || uid}
                      </span>
                      <span style={{ fontSize: "0.8rem", color: "#999" }}>
                        {u.created_at || u.criado_em
                          ? new Date(u.created_at || u.criado_em).toLocaleString("pt-BR")
                          : ""}
                      </span>
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button onClick={() => setActiveUpload(u)} style={pill("#EE222B", "#fff")}>
                        Abrir
                      </button>
                      <button onClick={() => handleDeleteUpload(uid)} style={pill("#fff", "#333", "1px solid #ccc")}>
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

  // -------- Workspace split (upload ativo) --------
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 150px)", minHeight: 520 }}>
      {/* Topo */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, flexShrink: 0 }}>
        <div>
          <h1 style={{ fontSize: "1.15rem" }}>
            Processo: <span style={{ color: "#EE222B" }}>{slug}</span>
          </h1>
          <span style={{ fontSize: "0.8rem", color: "#999" }}>
            {activeUpload.filename || activeUpload.arquivo_nome || activeUpload.nome || uploadId}
          </span>
        </div>
        <button onClick={resetActive} style={pill("#fff", "#333", "1px solid #ccc")}>
          Trocar arquivo
        </button>
      </div>

      {/* Split */}
      <div style={{ display: "flex", gap: 16, flex: 1, minHeight: 0 }}>
        {/* Esquerda: planilha com abas */}
        <div style={{ flex: "1 1 62%", minWidth: 0, height: "100%" }}>
          <SpreadsheetViewer
            docs={docs}
            activeDocId={activeDocId}
            onSelectDoc={setActiveDocId}
            onDownload={handleDownloadDoc}
            onCloseDoc={fecharDoc}
          />
        </div>

        {/* Direita: chat */}
        <div style={{ flex: "1 1 38%", minWidth: 320, height: "100%", display: "flex", flexDirection: "column" }}>
          {/* Cabeçalho do chat + seletor de conversas */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8, flexShrink: 0, position: "relative" }}>
            <h3 style={{ fontSize: "0.85rem", color: "#888", textTransform: "uppercase", letterSpacing: "0.04em" }}>
              Assistente
            </h3>
            <div style={{ position: "relative" }}>
              <button onClick={() => setConversasOpen((o) => !o)} style={pill("#fff", "#555", "1px solid #ddd")}>
                Conversas ▾
              </button>
              {conversasOpen && (
                <div style={dropdown}>
                  <button onClick={novaConversa} style={dropItem}>
                    + Nova conversa
                  </button>
                  {conversas.length === 0 && (
                    <div style={{ padding: "8px 12px", fontSize: "0.78rem", color: "#aaa" }}>
                      Nenhuma conversa anterior
                    </div>
                  )}
                  {conversas.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => abrirConversa(c.id)}
                      style={{ ...dropItem, fontWeight: c.id === chatId ? 700 : 400 }}
                      title={c.nome}
                    >
                      <span style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {c.nome || "Conversa"}
                      </span>
                      <span style={{ fontSize: "0.7rem", color: "#aaa" }}>
                        {c.criado_em ? new Date(c.criado_em).toLocaleString("pt-BR") : ""}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Cotas/estado atual */}
          {cotas.length > 0 && (
            <div style={cotasCard}>
              <div style={{ fontSize: "0.7rem", color: "#888", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 6 }}>
                Configuração atual
              </div>
              <ul style={{ margin: 0, paddingLeft: 16 }}>
                {cotas.map((c, i) => (
                  <li key={i} style={{ fontSize: "0.78rem", color: "#2a5a2a", marginBottom: 2 }}>{c}</li>
                ))}
              </ul>
            </div>
          )}

          <div style={{ flex: 1, minHeight: 0 }}>
            <ChatPanel
              messages={messages}
              onSend={handleSendChat}
              isLoading={chatLoading}
              suggestions={chatSuggestions}
              startLabel="Analisar a base e configurar"
              startMessage={startMessage}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// --- estilos util ---
const rowCard = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "12px 16px",
  background: "#fff",
  border: "1px solid #e0e0e0",
  borderRadius: 10,
};
const cotasCard = {
  background: "#f0faf0",
  border: "1px solid #d0e8d0",
  borderRadius: 10,
  padding: "10px 14px",
  marginBottom: 8,
  flexShrink: 0,
  maxHeight: 120,
  overflowY: "auto",
};
const dropdown = {
  position: "absolute",
  right: 0,
  top: "110%",
  zIndex: 20,
  background: "#fff",
  border: "1px solid #e0e0e0",
  borderRadius: 10,
  boxShadow: "0 6px 20px rgba(0,0,0,0.1)",
  minWidth: 240,
  maxHeight: 320,
  overflowY: "auto",
  padding: 4,
};
const dropItem = {
  display: "block",
  width: "100%",
  textAlign: "left",
  padding: "8px 12px",
  fontSize: "0.82rem",
  border: "none",
  background: "transparent",
  borderRadius: 6,
  cursor: "pointer",
  color: "#333",
};
function pill(bg, color, border = "none") {
  return {
    padding: "6px 14px",
    fontSize: "0.82rem",
    fontWeight: 600,
    border,
    borderRadius: 8,
    cursor: "pointer",
    background: bg,
    color,
  };
}
