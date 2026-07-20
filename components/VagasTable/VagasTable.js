"use client";

import { useMemo, useState } from "react";
import styles from "./VagasTable.module.css";

function statusBadge(status) {
  if (!status) return null;
  const s = status.toLowerCase();
  if (s.includes("suficiente")) return <span className={styles.badgeSuficientes}>Suficientes</span>;
  if (s.includes("aten")) return <span className={styles.badgeAtencao}>Atencao</span>;
  return <span className={styles.badgePoucos}>Poucos</span>;
}

export default function VagasTable({ vagas = [], onSelectVaga }) {
  const [search, setSearch] = useState("");
  const [localidade, setLocalidade] = useState("");

  const localidades = useMemo(() => {
    const set = new Set();
    vagas.forEach((v) => { if (v.localidade) set.add(v.localidade); });
    return Array.from(set).sort();
  }, [vagas]);

  const filtered = useMemo(() => {
    return vagas.filter((v) => {
      const nome = (v.vaga || v.nome || "").toLowerCase();
      if (search && !nome.includes(search.toLowerCase())) return false;
      if (localidade && v.localidade !== localidade) return false;
      return true;
    });
  }, [vagas, search, localidade]);

  return (
    <div className={styles.wrapper}>
      <div className={styles.filters}>
        <input className={`input ${styles.search}`} placeholder="Buscar vaga..." value={search} onChange={(e) => setSearch(e.target.value)} />
        <select className={styles.select} value={localidade} onChange={(e) => setLocalidade(e.target.value)}>
          <option value="">Todas as localidades</option>
          {localidades.map((l) => (<option key={l} value={l}>{l}</option>))}
        </select>
      </div>
      <div className={styles.tableWrap}>
        {filtered.length === 0 ? (
          <div className={styles.empty}>Nenhuma vaga encontrada</div>
        ) : (
          <table>
            <thead><tr><th>Vaga</th><th>Localidade</th><th>Candidatos</th><th>Status</th></tr></thead>
            <tbody>
              {filtered.map((v, i) => (
                <tr key={v.vaga || v.nome || i} className={styles.row} onClick={() => onSelectVaga?.(v)}>
                  <td>{v.vaga || v.nome}</td>
                  <td>{v.localidade || "-"}</td>
                  <td>{v.candidatos ?? v.total ?? "-"}</td>
                  <td>{statusBadge(v.status)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
