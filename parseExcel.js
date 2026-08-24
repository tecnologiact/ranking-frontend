// Leitura das colunas do arquivo direto no navegador (sem depender do backend).
// Extrai as abas e os cabeçalhos de cada uma para o analista explicar ao chat
// quais colunas existem e como devem ser usadas (item 1 da evolução).
// O SheetJS (xlsx) é pesado, então é carregado sob demanda (dynamic import)
// só quando um arquivo é de fato parseado — mantém o bundle inicial leve.

const VAGA_RE = /vaga/i;
const CAND_RE = /candidat|base|dados|inscri/i;

function headersFromSheet(XLSX, ws) {
  if (!ws) return [];
  // header:1 → primeira linha como array de títulos. defval evita buracos.
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, blankrows: false, defval: "" });
  const first = rows[0] || [];
  return first
    .map((h) => (h == null ? "" : String(h).trim()))
    .filter((h) => h.length > 0);
}

/**
 * Lê um File (.xlsx/.xls/.csv) e devolve as abas e colunas detectadas.
 * Faz uma leitura limitada de linhas (sheetRows) para ser rápido mesmo em
 * arquivos grandes — só precisamos dos cabeçalhos.
 * @returns {Promise<{sheets: {name:string, headers:string[]}[], candidatosSheet: string|null, vagasSheet: string|null, colunas: string[], colunasVagas: string[]}>}
 */
export async function lerColunasDoArquivo(file) {
  const XLSX = await import("xlsx");
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, {
    type: "array",
    sheetRows: 5, // só as primeiras linhas: basta pro cabeçalho
    cellFormula: false,
    cellHTML: false,
    cellStyles: false,
  });

  const sheets = wb.SheetNames.map((name) => ({
    name,
    headers: headersFromSheet(XLSX, wb.Sheets[name]),
  })).filter((s) => s.headers.length > 0);

  // Heurística: aba de vagas casa /vaga/i; candidatos é a primeira que não é vaga,
  // ou a com mais colunas.
  const vagas = sheets.find((s) => VAGA_RE.test(s.name)) || null;
  const naoVagas = sheets.filter((s) => s !== vagas);
  const candidatos =
    naoVagas.find((s) => CAND_RE.test(s.name)) ||
    naoVagas.slice().sort((a, b) => b.headers.length - a.headers.length)[0] ||
    sheets[0] ||
    null;

  return {
    sheets,
    candidatosSheet: candidatos?.name || null,
    vagasSheet: vagas?.name || null,
    colunas: candidatos?.headers || [],
    colunasVagas: vagas?.headers || [],
  };
}

/**
 * Lê um File OU Blob (.xlsx/.csv) completo para exibir num grid.
 * Devolve as abas com colunas + linhas (array de arrays), com corte de linhas
 * pra não travar o navegador em bases enormes.
 * @returns {Promise<{sheets: {name:string, columns:string[], rows:any[][], totalRows:number, truncated:boolean}[]}>}
 */
export async function lerPlanilha(fileOrBlob, { maxRows = 5000 } = {}) {
  const XLSX = await import("xlsx");
  const buf = await fileOrBlob.arrayBuffer();
  const wb = XLSX.read(buf, {
    type: "array",
    sheetRows: maxRows + 1, // cabeçalho + maxRows de dados
    cellFormula: false,
    cellHTML: false,
    cellStyles: false,
  });

  const sheets = wb.SheetNames.map((name) => {
    const ws = wb.Sheets[name];
    const aoa = XLSX.utils.sheet_to_json(ws, {
      header: 1,
      blankrows: false,
      defval: "",
    });
    const columns = (aoa[0] || []).map((h) => (h == null ? "" : String(h)));
    const rows = aoa.slice(1);
    const truncated = rows.length >= maxRows;
    return { name, columns, rows, totalRows: rows.length, truncated };
  }).filter((s) => s.columns.length > 0 || s.rows.length > 0);

  return { sheets };
}
