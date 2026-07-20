"use client";

import { useState, useEffect, use } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  getResultado,
  aprovarVaga,
  aprovarTudo,
  moverCandidato,
  rodarRanking,
  gerarRelatorio,
} from "@/lib/api";
import { useToast } from "@/lib/useToast";

export default function ResultadoPage({ params }) {
  const { slug, uploadId } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { addToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [resultado, setResultado] = useState(null);
  const [vagasList, setVagasList] = useState([]);
  const [selectedVaga, setSelectedVaga] = useState(searchParams.get("vaga") || "");
  const [vagaResult, setVagaResult] = useState(null);
  const [loadingVaga, setLoadingVaga] = useState(false);

  // Move form
  const [moveOpen, setMoveOpen] = useState(false);
  const [moveCandidatoId, setMoveCandidatoId] = useState("");
  const [moveParaVaga, setMoveParaVaga] = useState("");
  const [moveLoading, setMoveLoading] = useState(false);

  // Initial fetch
  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const data = await getResultado(slug, uploadId);
        setResultado(data);
        const vagas = data?.vagas || data?.resultado || [];
        setVagasList(Array.isArray(vagas) ? vagas : []);
      } catch (err) {
        addToast(err.message, "error");
      } finally {
        setLoading(false);
      }
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, uploadId]);

  // Fetch vaga detail
  useEffect(() => {
    if (!selectedVaga) {
      setVagaResult(null);
      return;
    }
    async function loadVaga() {
      try {
        setLoadingVaga(true);
        const data = await getResultado(slug, uploadId, selectedVaga);
        setVagaResult(data);
      } catch (err) {
        addToast(err.message, "error");
      } finally {
        setLoadingVaga(false);
      }
    }
    loadVaga();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedVaga]);

  async function handleAprovarVaga() {
    if (!selectedVaga) return;
    try {
      await aprovarVaga(slug, uploadId, selectedVaga);
      addToast(`Vaga "${selectedVaga}" aprovada!`, "success");
    } catch (err) {
      addToast(err.message, "error");
    }
  }

  async function handleAprovarTudo() {
    if (!confirm("Aprovar todas as vagas?")) return;
    try {
      await aprovarTudo(slug, uploadId);
      addToast("Todas as vagas foram aprovadas!", "success");
    } catch (err) {
      addToast(err.message, "error");
    }
  }

  async function handleMover(e) {
    e.preventDefault();
    if (!moveCandidatoId || !moveParaVaga) return;
    try {
      setMoveLoading(true);
      await moverCandidato(slug, uploadId, moveCandidatoId, selectedVaga, moveParaVaga);
      addToast("Candidato movido com sucesso!", "success");
      setMoveOpen(false);
      setMoveCandidatoId("");
      setMoveParaVaga("");
      // Refresh
      const data = await getResultado(slug, uploadId, selectedVaga);
      setVagaResult(data);
    } catch (err) {
      addToast(err.message, "error");
    } finally {
      setMoveLoading(false);
    }
  }

  async function handleReexecutar() {
    try {
      await rodarRanking(slug, uploadId, "C");
      addToast("Ranking reexecutado!", "success");
      const data = await getResultado(slug, uploadId);
      setResultado(data);
      const vagas = data?.vagas || data?.resultado || [];
      setVagasList(Array.isArray(vagas) ? vagas : []);
      if (selectedVaga) {
        const vData = await getResultado(slug, uploadId, selectedVaga);
        setVagaResult(vData);
      }
    } catch (err) {
      addToast(err.message, "error");
    }
  }

  async function handleExportar() {
    try {
      const blob = await gerarRelatorio(slug, uploadId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `relatorio_${slug}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      addToast("Relatorio exportado!", "success");
    } catch (err) {
      addToast(err.message, "error");
    }
  }

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: 60 }}>
        <span className="spinner" />
      </div>
    );
  }

  const candidatos = vagaResult?.candidatos || vagaResult?.resultado || [];
  const resumo = vagaResult?.resumo || null;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
        <button className="btn btn-sm" onClick={() => router.push(`/processos/${slug}`)}>
          &larr; Voltar
        </button>
        <h1 style={{ fontSize: "1.3rem", flex: 1 }}>
          Resultado &mdash;{" "}
          <span style={{ color: "var(--color-primary)" }}>{slug}</span>
        </h1>
        <button className="btn btn-sm" onClick={handleReexecutar}>
          Reexecutar ranking
        </button>
        <button className="btn btn-primary btn-sm" onClick={handleExportar}>
          Exportar relatorio
        </button>
        <button className="btn btn-sm" onClick={handleAprovarTudo}>
          Aprovar tudo
        </button>
      </div>

      <div style={{ display: "flex", gap: 20 }}>
        {/* Sidebar - vagas list */}
        <div
          style={{
            width: 260,
            flexShrink: 0,
            display: "flex",
            flexDirection: "column",
            gap: 4,
            maxHeight: "calc(100vh - 160px)",
            overflowY: "auto",
          }}
        >
          <h3
            style={{
              fontSize: "0.85rem",
              color: "var(--color-text-muted)",
              marginBottom: 8,
              textTransform: "uppercase",
              letterSpacing: "0.04em",
            }}
          >
            Vagas ({vagasList.length})
          </h3>
          {vagasList.map((v, i) => {
            const nome = v.vaga || v.nome || `Vaga ${i + 1}`;
            const isActive = selectedVaga === nome;
            return (
              <div
                key={nome}
                onClick={() => setSelectedVaga(nome)}
                style={{
                  padding: "10px 14px",
                  borderRadius: 8,
                  cursor: "pointer",
                  background: isActive ? "var(--color-primary)" : "var(--color-surface)",
                  color: isActive ? "#fff" : "var(--color-text)",
                  border: `1px solid ${isActive ? "var(--color-primary)" : "var(--color-border)"}`,
                  fontSize: "0.875rem",
                  transition: "background 0.15s",
                }}
              >
                {nome}
                {v.candidatos != null && (
                  <span
                    style={{
                      marginLeft: 8,
                      fontSize: "0.75rem",
                      opacity: 0.7,
                    }}
                  >
                    ({v.candidatos ?? v.total})
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Detail panel */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {!selectedVaga ? (
            <div
              className="panel"
              style={{
                textAlign: "center",
                padding: 60,
                color: "var(--color-text-muted)",
              }}
            >
              Selecione uma vaga na lista ao lado para ver os candidatos.
            </div>
          ) : loadingVaga ? (
            <div style={{ textAlign: "center", padding: 60 }}>
              <span className="spinner" />
            </div>
          ) : (
            <div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 16,
                }}
              >
                <h2 style={{ fontSize: "1.1rem" }}>{selectedVaga}</h2>
                <div style={{ display: "flex", gap: 8 }}>
                  <button className="btn btn-primary btn-sm" onClick={handleAprovarVaga}>
                    Aprovar vaga
                  </button>
                  <button
                    className="btn btn-sm"
                    onClick={() => setMoveOpen(!moveOpen)}
                  >
                    Mover candidato
                  </button>
                </div>
              </div>

              {/* KPI cards */}
              {resumo && (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
                    gap: 12,
                    marginBottom: 20,
                  }}
                >
                  {Object.entries(resumo).map(([key, val]) => (
                    <div
                      key={key}
                      className="panel"
                      style={{ textAlign: "center", padding: "14px 12px" }}
                    >
                      <div
                        style={{
                          fontSize: "0.75rem",
                          color: "var(--color-text-muted)",
                          marginBottom: 4,
                          textTransform: "capitalize",
                        }}
                      >
                        {key.replace(/_/g, " ")}
                      </div>
                      <div style={{ fontSize: "1.3rem", fontWeight: 700 }}>
                        {val}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Move candidato form */}
              {moveOpen && (
                <form
                  onSubmit={handleMover}
                  className="panel"
                  style={{
                    display: "flex",
                    gap: 10,
                    alignItems: "flex-end",
                    marginBottom: 16,
                    padding: 14,
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <label
                      style={{
                        display: "block",
                        fontSize: "0.8rem",
                        color: "var(--color-text-muted)",
                        marginBottom: 4,
                      }}
                    >
                      ID do candidato
                    </label>
                    <input
                      className="input"
                      style={{ width: "100%" }}
                      value={moveCandidatoId}
                      onChange={(e) => setMoveCandidatoId(e.target.value)}
                      placeholder="Ex: 12345"
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label
                      style={{
                        display: "block",
                        fontSize: "0.8rem",
                        color: "var(--color-text-muted)",
                        marginBottom: 4,
                      }}
                    >
                      Mover para vaga
                    </label>
                    <input
                      className="input"
                      style={{ width: "100%" }}
                      value={moveParaVaga}
                      onChange={(e) => setMoveParaVaga(e.target.value)}
                      placeholder="Nome da vaga destino"
                    />
                  </div>
                  <button
                    className="btn btn-primary btn-sm"
                    type="submit"
                    disabled={moveLoading}
                  >
                    {moveLoading ? "Movendo..." : "Mover"}
                  </button>
                </form>
              )}

              {/* Candidates table */}
              {Array.isArray(candidatos) && candidatos.length > 0 ? (
                <div
                  style={{
                    border: "1px solid var(--color-border)",
                    borderRadius: 10,
                    overflow: "auto",
                    maxHeight: "calc(100vh - 340px)",
                  }}
                >
                  <table>
                    <thead>
                      <tr>
                        {Object.keys(candidatos[0]).map((col) => (
                          <th key={col}>{col}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {candidatos.map((c, i) => (
                        <tr key={c.id || c.candidato_id || i}>
                          {Object.values(c).map((val, j) => (
                            <td key={j}>
                              {val === null || val === undefined ? "-" : String(val)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div
                  className="panel"
                  style={{
                    textAlign: "center",
                    padding: 40,
                    color: "var(--color-text-muted)",
                  }}
                >
                  Nenhum candidato encontrado para esta vaga.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
