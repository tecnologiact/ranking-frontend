'use client';

import { useState, useMemo } from 'react';
import styles from './VagasTable.module.css';

export default function VagasTable({ vagas = [], onSelectVaga }) {
  const [search, setSearch] = useState('');

  const columns = useMemo(() => {
    if (!vagas.length) return [];
    return Object.keys(vagas[0]);
  }, [vagas]);

  const filtered = useMemo(() => {
    if (!search.trim()) return vagas;
    const term = search.toLowerCase();
    return vagas.filter((v) =>
      Object.values(v).some(
        (val) => val != null && String(val).toLowerCase().includes(term)
      )
    );
  }, [vagas, search]);

  return (
    <div className={styles.wrapper}>
      <div className={styles.searchBar}>
        <input
          type="text"
          placeholder="Buscar vaga..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={styles.searchInput}
        />
      </div>

      {filtered.length === 0 ? (
        <div className={styles.empty}>Nenhuma vaga encontrada</div>
      ) : (
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                {columns.map((col) => (
                  <th key={col}>{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((vaga, i) => (
                <tr
                  key={i}
                  className={styles.row}
                  onClick={() => onSelectVaga?.(vaga)}
                >
                  {columns.map((col) => (
                    <td key={col}>{vaga[col] != null ? String(vaga[col]) : ''}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
