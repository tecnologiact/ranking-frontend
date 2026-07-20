"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { listarProcessos, criarProcesso, deletarProcesso } from "@/lib/api";
import { useToast } from "@/lib/useToast";

export default function HomePage() {
  const [processos, setProcessos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [nome, setNome] = useState("");
  const [creating, setCreating] = useState(false);
  const { addToast } = useToast();

  async function fetchProcessos() {
    try {
      setLoading(true);
      const data = await listarProcessos();
      setProcessos(Array.isArray(data) ? data : []);
    } catch (err) {
      addToast(err.message, "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchProcessos();
  }, []);

  async function handleCriar(e) {
    e.preventDefault();
    if (!nome.trim()) return;
    try {
      setCreating(true);
      await criarProcesso(nome.trim());
      addToast("Processo criado com sucesso!", "success");
      setNome("");
      await fetchProcessos();
    } catch (err) {
      addToast(err.message, "error");
    } finally {
      setCreating(false);
    }
  }

  async function handleDeletar(slug) {
    if (!confirm(`Tem certeza que deseja excluir o processo "${slug}"?`)) return;
    try {
      await deletarProcesso(slug);
      addToast("Processo excluido.", "success");
      await fetchProcessos();
    } catch (err) {
      addToast(err.message, "error");
    }
  }

  return (
    <div>
      <h1 style={{ fontSize: "1.5rem", marginBottom: 24 }}>Processos Seletivos</h1>
      <form onSubmit={handleCriar} style={{ display: "flex", gap: 10, marginBottom: 28 }}>
        <input className="input" placeholder="Nome do novo processo..." value={nome} onChange={(e) => setNome(e.target.value)} style={{ flex: 1, maxWidth: 400 }} />
        <button className="btn btn-primary" type="submit" disabled={creating}>{creating ? "Criando..." : "Criar novo processo"}</button>
      </form>

      {loading ? (
        <div style={{ textAlign: "center", padding: 40 }}><span className="spinner" /></div>
      ) : processos.length === 0 ? (
        <div className="panel" style={{ textAlign: "center", padding: 40, color: "var(--color-text-muted)" }}>Nenhum processo encontrado. Crie o primeiro acima.</div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
          {processos.map((p) => (
            <div key={p.slug || p.id} className="panel" style={{ position: "relative" }}>
              <Link href={`/processos/${p.slug}`} style={{ display: "block", fontSize: "1.05rem", fontWeight: 600, marginBottom: 6 }}>{p.nome || p.slug}</Link>
              <span style={{ fontSize: "0.8rem", color: "var(--color-text-muted)" }}>/{p.slug}</span>
              <button className="btn btn-danger btn-sm" style={{ position: "absolute", top: 14, right: 14 }} onClick={() => handleDeletar(p.slug)}>Excluir</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
