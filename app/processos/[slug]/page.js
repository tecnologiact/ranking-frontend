"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import {
  listarUploads,
  uploadExcel,
  limparUpload,
  getRegras,
  enviarChat,
  rodarRanking,
} from "@/lib/api";
import { useToast } from "@/lib/useToast";
import UploadArea from "@/components/UploadArea/UploadArea";
import VagasTable from "@/components/VagasTable/VagasTable";
import ChatPanel from "@/components/ChatPanel/ChatPanel";

export default function ProcessoPage({ params }) {
  const { slug } = use(params);
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
    getRegras(slug, activeUpload.id || activeUpload.upload_id)
      .then((data) => {
        const r = Array.isArray(data) ? data : data?.regras || [];
        setRegras(r);
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeUpload]);

  async function handleUpload(file) {
    try {
      setUploading(true);
      const result = await uploadExcel(slug, file);
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
      await limparUpload(uploadId);
      addToast("Upload excluido.", "success");
      if (activeUpload && (activeUpload.id === uploadId || activeUpload.upload_id === uploadId)) {
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
      const res = await enviarChat(slug, mensagem, chatId, uploadId);
      if (res?.chat_id) setChatId(res.chat_id);
      const resposta =
        res?.resposta || res?.mensagem || res?.message || res?.content || "";
      setMessages((prev) => [...prev, { role: "assistant", content: resposta }]);
      if (res?.regras) setRegras(res.regras);
      if (res?.vagas) setVagas(res.vagas);
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

  async function handleRanking() {
    const uploadId = activeUpload?.id || activeUpload?.upload_id;
    if (!uploadId) return;
    try {
      setRankingLoading(true);
      await rodarRanking(slug, uploadId, "C");
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
        <h1 style={{ fontSize: "1.3rem", marginBottom: 20 }}>
          Processo: <span style={{ color: "var(--color-primary)" }}>{slug}</span>
        </h1>

        <UploadArea onUpload={handleUpload} isLoading={uploading} />

        {uploads.length > 0 && (
          <div style={{ marginTop: 28 }}>
            <h2 style={{ fontSize: "1rem", marginBottom: 12, color: "var(--color-text-muted)" }}>
              Uploads anteriores
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {uploads.map((u) => {
                const uid = u.id || u.upload_id;
                return (
                  <div
                    key={uid}
                    className="panel"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "12px 16px",
                    }}
                  >
                    <div>
                      <span style={{ fontWeight: 500, marginRight: 12 }}>
                        {u.filename || u.nome || uid}
                      </span>
                      <span style={{ fontSize: "0.8rem", color: "var(--color-text-muted)" }}>
                        {u.created_at ? new Date(u.created_at).toLocaleString("pt-BR") : ""}
                      </span>
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => {
                          setActiveUpload(u);
                          if (u.vagas) setVagas(u.vagas);
                        }}
                      >
                        Continuar
                      </button>
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => handleDeleteUpload(uid)}
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
            Processo: <span style={{ color: "var(--color-primary)" }}>{slug}</span>
          </h1>
          <span style={{ fontSize: "0.8rem", color: "var(--color-text-muted)" }}>
            Arquivo: {activeUpload.filename || activeUpload.nome || uploadId}
          </span>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button
            className="btn btn-primary"
            onClick={handleRanking}
            disabled={rankingLoading}
          >
            {rankingLoading ? "Executando..." : "Executar ranking"}
          </button>
          <button
            className="btn btn-sm"
            onClick={() => {
              setActiveUpload(null);
              setMessages([]);
              setChatId(null);
              setRegras([]);
              setVagas([]);
            }}
          >
            Trocar arquivo
          </button>
        </div>
      </div>

      <div style={{ display: "flex", gap: 20, alignItems: "flex-start" }}>
        <div style={{ flex: "0 0 55%", minWidth: 0 }}>
          <VagasTable
            vagas={vagas}
            onSelectVaga={(v) => {
              router.push(`/processos/${slug}/resultado/${uploadId}?vaga=${encodeURIComponent(v.vaga || v.nome)}`);
            }}
          />
        </div>
        <div style={{ flex: "0 0 45%", minWidth: 0 }}>
          <ChatPanel
            messages={messages}
            onSend={handleSendChat}
            isLoading={chatLoading}
            regras={regras}
          />
        </div>
      </div>
    </div>
  );
}
