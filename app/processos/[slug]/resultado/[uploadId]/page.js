"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  obterResultado,
  aprovarVaga,
  aprovarTudo,
  moverCandidato,
  baixarRelatorio,
} from "@/lib/api";
import { useToast } from "@/lib/useToast";

export default function ResultadoPage({ params }) {
  const { slug, uploadId } = params;
  const router = useRouter();
  const { addToast } = useToast();

  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [vagasList, setVagasList] = useState([]);
  const [selectedVaga, setSelectedVaga] = useState(null);
  const [vagaResult, setVagaResult] = useState(null);
  const [loadingVaga, setLoadingVaga] = useState(false);

  // Vaga number input
  const [vagaInput, setVagaInput] = useState("");

  // Move form
  const [moveOpen, setMoveOpen] = useState(false);
  const [moveCandidatoId, setMoveCandidatoId] = useState("");
  const [moveParaVaga, setMoveParaVaga] = useState("");
  const [moveMotivo, setMoveMotivo] = useState("");
  const [moveLoading, setMoveLoading] = useState(false);

  // Try to load vaga 1 on mount as a starting point
  useEffect(() => {
    loadVaga(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, uploadId]);

  async function loadVaga(vagaNum) {
    if (vagaNum === null || vagaNum === undefined) return;
    try {
      setLoadingVaga(true);
      setSelectedVaga(vagaNum);
      const data = await obterResultado(slug, uploadId, vagaNum);
      setVagaResult(data);
      // If the response contains a list of vagas, store it
      if (data?.vagas && Array.isArray(data.vagas)) {
        setVagasList(data.vagas);
      }
    } catch (err) {
      setVagaResult(null);
      addToast(err.message, "error");
    } finally {
      setLoadingVaga(false);
    }
  }

  function handleVagaInputSubmit(e) {
    e.preventDefault();
    const num = parseInt(vagaInput, 10);
    if (!isNaN(num) && num > 0) {
      loadVaga(num);
    }
  }

  async function handleAprovarVaga() {
    if (selectedVaga === null) return;
    try {
      await aprovarVaga(slug, uploadId, selectedVaga);
      addToast(`Vaga ${selectedVaga} aprovada!`, "success");
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
      await moverCandidato(slug, uploadId, {
        candidato_codigo: moveCandidatoId,
        vaga_destino: parseInt(moveParaVaga, 10),
        motivo: moveMotivo || "Movido manualmente",
      });
      addToast("Candidato movido com sucesso!", "success");
      setMoveOpen(false);
      setMoveCandidatoId("");
      setMoveParaVaga("");
      setMoveMotivo("");
      // Refresh current vaga
      if (selectedVaga !== null) loadVaga(selectedVaga);
    } catch (err) {
      addToast(err.message, "error");
    } finally {
      setMoveLoading(false);
    }
  }

  async function handleExportar() {
    try {
      const blob = await baixarRelatorio({ processo: slug, upload_id: uploadId }, { baixar: false });
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

  const candidatos = vagaResult?.candidatos || vagaResult?.resultado || [];
  const resumo = vagaResult?.resumo || null;

  const btnStyle = {
    padding: "7px 16px",
    fontSize: "0.85rem",
    fontWeight: 600,
    border: "1px solid #ccc",
    borderRadius: 6,
    cursor: "pointer",
    background: "#fff",
    color: "#333",
  };

  const btnPrimaryStyle = {
    ...btnStyle,
    background: "#EE222B",
    color: "#fff",
    border: "none",
  };

  const labelStyle = {
    display: "block",
    fontSize: "0.8rem",
    color: "#888",
    marginBottom: 4,
  };

  const inputStyle = {
    width: "100%",
    padding: "8px 10px",
    fontSize: "0.9rem",
    border: "1px solid #ccc",
    borderRadius: 6,
    outline: "none",
  };

  return (
    <div>
      {/* Top bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginBottom: 20,
          flexWrap: "wrap",
        }}
      >
        <button
          style={btnStyle}
          onClick={() => router.push(`/processos/${slug}`)}
        >
          &larr; Voltar
        </button>
        <h1 style={{ fontSize: "1.3rem", flex: 1, minWidth: 200 }}>
          Resultado &mdash;{" "}
          <span style={{ color: "#EE222B" }}>{slug}</span>
        </h1>
        <button style={btnPrimaryStyle} onClick={handleExportar} title="Baixar planilha Excel com os resultados">
          Exportar relatório
        </button>
        <button style={btnStyle} onClick={handleAprovarTudo} title="Aprovar a distribuição de todas as vagas de uma vez">
          Aprovar tudo
        </button>
      </div>

      {/* Guidance */}
      <div style={{
        background: "#f0f7ff",
        border: "1px solid #d0e0f0",
        borderRadius: 10,
        padding: "12px 18px",
        marginBottom: 20,
        fontSize: "0.82rem",
        color: "#3a5a7a",
        lineHeight: 1.6,
      }}>
        Selecione uma vaga no painel lateral para ver os candidatos distribuídos.
        Você pode <strong>aprovar</strong> vaga a vaga ou todas de uma vez,
        <strong> mover candidatos</strong> manualmente entre vagas,
        <strong> reexecutar</strong> o ranking com novas regras,
        ou <strong>exportar</strong> o relatório final em Excel com as abas Ranking Completo, Aprovados, Stand-by e Indicadores.
      </div>

      <div style={{ display: "flex", gap: 20 }}>
        {/* Sidebar */}
        <div
          style={{
            width: 260,
            flexShrink: 0,
            display: "flex",
            flexDirection: "column",
            gap: 8,
            maxHeight: "calc(100vh - 160px)",
            overflowY: "auto",
          }}
        >
          <h3
            style={{
              fontSize: "0.85rem",
              color: "#888",
              marginBottom: 4,
              textTransform: "uppercase",
              letterSpacing: "0.04em",
            }}
          >
            Selecionar vaga
          </h3>

          {/* Vaga number input */}
          <form
            onSubmit={handleVagaInputSubmit}
            style={{ display: "flex", gap: 6, marginBottom: 8 }}
          >
            <input
              type="number"
              min="1"
              placeholder="N. da vaga"
              value={vagaInput}
              onChange={(e) => setVagaInput(e.target.value)}
              style={{
                ...inputStyle,
                flex: 1,
              }}
            />
            <button type="submit" style={btnPrimaryStyle}>
              Ir
            </button>
          </form>

          {/* Quick vaga buttons */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: 4,
              marginBottom: 8,
            }}
          >
            {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
              <button
                key={n}
                onClick={() => loadVaga(n)}
                style={{
                  padding: "8px 0",
                  fontSize: "0.85rem",
                  fontWeight: selectedVaga === n ? 700 : 500,
                  border: `1px solid ${selectedVaga === n ? "#EE222B" : "#e0e0e0"}`,
                  borderRadius: 6,
                  cursor: "pointer",
                  background: selectedVaga === n ? "#EE222B" : "#fff",
                  color: selectedVaga === n ? "#fff" : "#333",
                  transition: "all 0.15s",
                }}
              >
                {n}
              </button>
            ))}
          </div>

          {/* Dynamic vagas list if available */}
          {vagasList.length > 0 && (
            <>
              <h3
                style={{
                  fontSize: "0.8rem",
                  color: "#888",
                  marginTop: 8,
                  marginBottom: 4,
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                }}
              >
                Vagas encontradas ({vagasList.length})
              </h3>
              {vagasList.map((v, i) => {
                const vagaId = v.id || v.vaga_id || i + 1;
                const nome = v.vaga || v.nome || `Vaga ${vagaId}`;
                const isActive = selectedVaga === vagaId;
                return (
                  <div
                    key={vagaId}
                    onClick={() => loadVaga(vagaId)}
                    style={{
                      padding: "10px 14px",
                      borderRadius: 8,
                      cursor: "pointer",
                      background: isActive ? "#EE222B" : "#fff",
                      color: isActive ? "#fff" : "#333",
                      border: `1px solid ${isActive ? "#EE222B" : "#e0e0e0"}`,
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
            </>
          )}
        </div>

        {/* Detail panel */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {selectedVaga === null ? (
            <div
              style={{
                textAlign: "center",
                padding: 60,
                color: "#999",
                background: "#fff",
                border: "1px solid #e0e0e0",
                borderRadius: 10,
              }}
            >
              <div style={{ fontSize: "2rem", marginBottom: 8 }}>&#128204;</div>
              <p style={{ fontWeight: 500, color: "#555", marginBottom: 4 }}>Selecione uma vaga</p>
              <p style={{ fontSize: "0.8rem" }}>Escolha uma vaga no painel lateral ou digite o número para visualizar os candidatos distribuídos.</p>
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
                <h2 style={{ fontSize: "1.1rem" }}>Vaga {selectedVaga}</h2>
                <div style={{ display: "flex", gap: 8 }}>
                  <button style={btnPrimaryStyle} onClick={handleAprovarVaga}>
                    Aprovar vaga
                  </button>
                  <button
                    style={btnStyle}
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
                      style={{
                        textAlign: "center",
                        padding: "14px 12px",
                        background: "#fff",
                        border: "1px solid #e0e0e0",
                        borderRadius: 10,
                      }}
                    >
                      <div
                        style={{
                          fontSize: "0.75rem",
                          color: "#888",
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
                  style={{
                    display: "flex",
                    gap: 10,
                    alignItems: "flex-end",
                    marginBottom: 16,
                    padding: 14,
                    background: "#fff",
                    border: "1px solid #e0e0e0",
                    borderRadius: 10,
                    flexWrap: "wrap",
                  }}
                >
                  <div style={{ flex: 1, minWidth: 120 }}>
                    <label style={labelStyle}>Codigo do candidato</label>
                    <input
                      style={inputStyle}
                      value={moveCandidatoId}
                      onChange={(e) => setMoveCandidatoId(e.target.value)}
                      placeholder="Ex: 12345"
                    />
                  </div>
                  <div style={{ flex: 1, minWidth: 120 }}>
                    <label style={labelStyle}>Vaga destino (numero)</label>
                    <input
                      type="number"
                      style={inputStyle}
                      value={moveParaVaga}
                      onChange={(e) => setMoveParaVaga(e.target.value)}
                      placeholder="Ex: 3"
                    />
                  </div>
                  <div style={{ flex: 1, minWidth: 120 }}>
                    <label style={labelStyle}>Motivo</label>
                    <input
                      style={inputStyle}
                      value={moveMotivo}
                      onChange={(e) => setMoveMotivo(e.target.value)}
                      placeholder="Motivo da movimentacao"
                    />
                  </div>
                  <button
                    style={{
                      ...btnPrimaryStyle,
                      opacity: moveLoading ? 0.6 : 1,
                    }}
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
                    border: "1px solid #e0e0e0",
                    borderRadius: 10,
                    overflow: "auto",
                    maxHeight: "calc(100vh - 340px)",
                  }}
                >
                  <table
                    style={{
                      width: "100%",
                      borderCollapse: "collapse",
                      fontSize: "0.85rem",
                    }}
                  >
                    <thead>
                      <tr>
                        {Object.keys(candidatos[0]).map((col) => (
                          <th
                            key={col}
                            style={{
                              padding: "10px 12px",
                              textAlign: "left",
                              borderBottom: "2px solid #e0e0e0",
                              background: "#fafafa",
                              fontWeight: 600,
                              fontSize: "0.8rem",
                              color: "#555",
                              whiteSpace: "nowrap",
                              position: "sticky",
                              top: 0,
                            }}
                          >
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {candidatos.map((c, i) => (
                        <tr
                          key={c.id || c.candidato_id || i}
                          style={{
                            borderBottom: "1px solid #f0f0f0",
                          }}
                        >
                          {Object.values(c).map((val, j) => (
                            <td
                              key={j}
                              style={{
                                padding: "8px 12px",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {val === null || val === undefined
                                ? "-"
                                : String(val)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div
                  style={{
                    textAlign: "center",
                    padding: 40,
                    color: "#999",
                    background: "#fff",
                    border: "1px solid #e0e0e0",
                    borderRadius: 10,
                  }}
                >
                  <div style={{ fontSize: "2rem", marginBottom: 8 }}>&#128100;</div>
                  <p style={{ fontWeight: 500, color: "#555", marginBottom: 4 }}>Nenhum candidato encontrado</p>
                  <p style={{ fontSize: "0.8rem" }}>Esta vaga não possui candidatos distribuídos. Execute o ranking ou selecione outra vaga.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
