"use client";

import { useState, useMemo, useEffect } from "react";

// Visualizador estilo "artefato do Claude": abas em cima (planilha do upload +
// documentos que a IA vai gerando), grid embaixo com busca. Documentos gerados
// pela IA têm um botão explícito de baixar (o download nunca é automático).
//
// props:
//   docs: [{ id, label, kind: 'upload'|'gerado', loading?, error?, downloadAcao?,
//            sheets: [{ name, columns, rows, totalRows, truncated }] }]
//   activeDocId, onSelectDoc(id)
//   onDownload(doc)   -> baixa de verdade (clique explícito)
//   onCloseDoc(doc)   -> fecha uma aba gerada (opcional)
export default function SpreadsheetViewer({
  docs = [],
  activeDocId,
  onSelectDoc,
  onDownload,
  onCloseDoc,
}) {
  const activeDoc = docs.find((d) => d.id === activeDocId) || docs[0] || null;

  const [sheetIdx, setSheetIdx] = useState(0);
  const [busca, setBusca] = useState("");
  const [limite, setLimite] = useState(100);

  // Reseta seleção de aba interna e busca ao trocar de documento.
  useEffect(() => {
    setSheetIdx(0);
    setBusca("");
    setLimite(100);
  }, [activeDocId]);

  const sheet = activeDoc?.sheets?.[sheetIdx] || null;

  const linhasFiltradas = useMemo(() => {
    if (!sheet) return [];
    const rows = sheet.rows || [];
    const termo = busca.trim().toLowerCase();
    if (!termo) return rows;
    return rows.filter((r) =>
      r.some((c) => c != null && String(c).toLowerCase().includes(termo))
    );
  }, [sheet, busca]);

  const visiveis = linhasFiltradas.slice(0, limite);

  if (!docs.length) {
    return (
      <div style={emptyWrap}>
        <div style={{ fontSize: "2rem", marginBottom: 8 }}>📄</div>
        <p style={{ fontWeight: 600, color: "#555", marginBottom: 4 }}>
          Nenhuma planilha aberta
        </p>
        <p style={{ fontSize: "0.82rem", color: "#999", maxWidth: 280 }}>
          Suba um arquivo para vê-lo aqui. Conforme você conversa com a IA, os
          resultados (ranking, planilha enriquecida) vão abrir como novas abas.
        </p>
      </div>
    );
  }

  return (
    <div style={wrap}>
      {/* Abas de documentos */}
      <div style={tabBar}>
        {docs.map((d) => {
          const active = d.id === (activeDoc?.id);
          return (
            <button
              key={d.id}
              onClick={() => onSelectDoc?.(d.id)}
              title={d.label}
              style={{
                ...tab,
                background: active ? "#fff" : "transparent",
                borderColor: active ? "#e5e5e7" : "transparent",
                borderBottomColor: active ? "#fff" : "transparent",
                color: active ? "#1d1d1b" : "#666",
                fontWeight: active ? 600 : 500,
              }}
            >
              {d.loading && <span style={miniSpinner} />}
              <span style={tabLabel}>{d.label}</span>
              {d.kind === "gerado" && onCloseDoc && (
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    onCloseDoc(d);
                  }}
                  style={closeX}
                  title="Fechar aba"
                >
                  ×
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Toolbar do documento ativo */}
      {activeDoc && (
        <div style={toolbar}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0, flex: 1 }}>
            {activeDoc.sheets?.length > 1 && (
              <div style={{ display: "flex", gap: 4, overflowX: "auto" }}>
                {activeDoc.sheets.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => setSheetIdx(i)}
                    style={{
                      ...sheetPill,
                      background: i === sheetIdx ? "#fde8e9" : "#f4f4f6",
                      color: i === sheetIdx ? "#EE222B" : "#666",
                      border: `1px solid ${i === sheetIdx ? "#f2c6c8" : "#e2e2e6"}`,
                    }}
                  >
                    {s.name}
                  </button>
                ))}
              </div>
            )}
            {sheet && (
              <input
                value={busca}
                onChange={(e) => {
                  setBusca(e.target.value);
                  setLimite(100);
                }}
                placeholder="Buscar na planilha..."
                style={searchInput}
              />
            )}
          </div>
          {activeDoc.kind === "gerado" && activeDoc.downloadAcao && (
            <button onClick={() => onDownload?.(activeDoc)} style={downloadBtn}>
              ⬇ Baixar .xlsx
            </button>
          )}
        </div>
      )}

      {/* Corpo */}
      <div style={body}>
        {activeDoc?.loading ? (
          <div style={centered}>
            <span className="spinner" />
            <p style={{ color: "#888", marginTop: 10, fontSize: "0.85rem" }}>
              Gerando e carregando a aba...
            </p>
          </div>
        ) : activeDoc?.error ? (
          <div style={centered}>
            <p style={{ color: "#EE222B", fontWeight: 600 }}>Erro ao carregar</p>
            <p style={{ color: "#888", fontSize: "0.82rem", maxWidth: 360, textAlign: "center" }}>
              {activeDoc.error}
            </p>
          </div>
        ) : !sheet ? (
          <div style={centered}>
            <p style={{ color: "#999" }}>Planilha vazia.</p>
          </div>
        ) : (
          <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
            <div style={{ flex: 1, overflow: "auto" }}>
              <table style={table}>
                <thead>
                  <tr>
                    <th style={{ ...th, ...thIdx }}>#</th>
                    {sheet.columns.map((c, i) => (
                      <th key={i} style={th} title={c}>
                        {c || <span style={{ color: "#bbb" }}>(col {i + 1})</span>}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {visiveis.map((row, ri) => (
                    <tr key={ri} style={ri % 2 ? trAlt : undefined}>
                      <td style={{ ...td, ...tdIdx }}>{ri + 1}</td>
                      {sheet.columns.map((_, ci) => (
                        <td key={ci} style={td} title={fmt(row[ci])}>
                          {fmt(row[ci])}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={statusBar}>
              <span>
                {linhasFiltradas.length.toLocaleString("pt-BR")} linha(s)
                {busca ? " (filtradas)" : ""}
                {sheet.truncated ? " · exibindo o começo da base" : ""}
              </span>
              {visiveis.length < linhasFiltradas.length && (
                <button onClick={() => setLimite((l) => l + 200)} style={maisBtn}>
                  Mostrar mais
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function fmt(v) {
  if (v === null || v === undefined || v === "") return "";
  return String(v);
}

// --- estilos ---
const wrap = {
  height: "100%",
  display: "flex",
  flexDirection: "column",
  background: "#fff",
  border: "1px solid #e5e5e7",
  borderRadius: 12,
  overflow: "hidden",
};
const emptyWrap = {
  height: "100%",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  textAlign: "center",
  background: "#fff",
  border: "1px solid #e5e5e7",
  borderRadius: 12,
  padding: 24,
};
const tabBar = {
  display: "flex",
  gap: 2,
  padding: "8px 8px 0",
  background: "#f7f7f8",
  borderBottom: "1px solid #e5e5e7",
  overflowX: "auto",
};
const tab = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "8px 12px",
  fontSize: "0.8rem",
  border: "1px solid transparent",
  borderRadius: "8px 8px 0 0",
  cursor: "pointer",
  maxWidth: 220,
  whiteSpace: "nowrap",
};
const tabLabel = { overflow: "hidden", textOverflow: "ellipsis", maxWidth: 170 };
const closeX = { marginLeft: 2, color: "#999", fontSize: "1rem", lineHeight: 1 };
const toolbar = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: "8px 12px",
  borderBottom: "1px solid #eee",
};
const sheetPill = {
  padding: "4px 10px",
  fontSize: "0.74rem",
  fontWeight: 600,
  borderRadius: 999,
  cursor: "pointer",
  whiteSpace: "nowrap",
};
const searchInput = {
  flex: 1,
  minWidth: 120,
  padding: "6px 10px",
  fontSize: "0.82rem",
  border: "1px solid #ddd",
  borderRadius: 8,
  outline: "none",
};
const downloadBtn = {
  padding: "7px 14px",
  fontSize: "0.8rem",
  fontWeight: 600,
  background: "#EE222B",
  color: "#fff",
  border: "none",
  borderRadius: 8,
  cursor: "pointer",
  whiteSpace: "nowrap",
};
const body = { flex: 1, minHeight: 0 };
const centered = {
  height: "100%",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: 4,
};
const table = { borderCollapse: "collapse", fontSize: "0.8rem", width: "max-content", minWidth: "100%" };
const th = {
  position: "sticky",
  top: 0,
  background: "#fafafa",
  textAlign: "left",
  padding: "8px 12px",
  borderBottom: "2px solid #e5e5e7",
  borderRight: "1px solid #f0f0f0",
  fontWeight: 600,
  color: "#555",
  whiteSpace: "nowrap",
  maxWidth: 260,
  overflow: "hidden",
  textOverflow: "ellipsis",
};
const thIdx = { left: 0, zIndex: 2, background: "#f2f2f4", color: "#aaa", width: 44 };
const td = {
  padding: "6px 12px",
  borderBottom: "1px solid #f2f2f2",
  borderRight: "1px solid #f6f6f6",
  whiteSpace: "nowrap",
  maxWidth: 260,
  overflow: "hidden",
  textOverflow: "ellipsis",
  color: "#333",
};
const tdIdx = {
  position: "sticky",
  left: 0,
  background: "#fbfbfc",
  color: "#bbb",
  textAlign: "right",
  width: 44,
};
const trAlt = { background: "#fcfcfd" };
const statusBar = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "6px 12px",
  borderTop: "1px solid #eee",
  fontSize: "0.72rem",
  color: "#999",
  background: "#fafafa",
};
const maisBtn = {
  padding: "4px 12px",
  fontSize: "0.72rem",
  fontWeight: 600,
  border: "1px solid #ddd",
  borderRadius: 6,
  background: "#fff",
  color: "#555",
  cursor: "pointer",
};
const miniSpinner = {
  width: 10,
  height: 10,
  border: "2px solid #ddd",
  borderTopColor: "#EE222B",
  borderRadius: "50%",
  display: "inline-block",
  animation: "spin 0.7s linear infinite",
};
