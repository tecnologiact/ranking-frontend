import { getToken } from "./auth";

const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "https://ranking-beckend.vercel.app";

async function request(path, options = {}) {
  const token = getToken();
  const headers = { ...(options.headers || {}) };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  if (!(options.body instanceof FormData) && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    let detail = res.statusText;
    try {
      const err = await res.json();
      detail = err.detail || err.message || JSON.stringify(err);
    } catch (_) {}
    throw new Error(`Erro ${res.status}: ${detail}`);
  }

  const contentType = res.headers.get("content-type") || "";
  if (
    contentType.includes("application/vnd") ||
    contentType.includes("application/octet-stream") ||
    contentType.includes("spreadsheet")
  ) {
    return res.blob();
  }

  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch (_) {
    return text;
  }
}

/* ---- Processos ---- */

export function listarProcessos() {
  return request("/processos");
}

export function criarProcesso(nome) {
  return request("/processos", {
    method: "POST",
    body: JSON.stringify({ nome }),
  });
}

export function deletarProcesso(slug) {
  return request(`/processos/${slug}`, { method: "DELETE" });
}

/* ---- Uploads ---- */

export function uploadExcel(slug, file) {
  const form = new FormData();
  form.append("file", file);
  return request(`/processos/${slug}/upload`, {
    method: "POST",
    body: form,
  });
}

export function listarUploads(slug) {
  return request(`/processos/${slug}/uploads`);
}

export function limparUpload(uploadId) {
  return request(`/uploads/${uploadId}`, { method: "DELETE" });
}

/* ---- Regras ---- */

export function getRegras(slug, uploadId) {
  return request(`/processos/${slug}/regras?upload_id=${uploadId}`);
}

export function salvarRegras(slug, regras, uploadId) {
  return request(`/processos/${slug}/regras`, {
    method: "POST",
    body: JSON.stringify({ regras, upload_id: uploadId }),
  });
}

/* ---- Chat ---- */

export function enviarChat(slug, mensagem, chatId, uploadId) {
  return request(`/processos/${slug}/chat`, {
    method: "POST",
    body: JSON.stringify({ mensagem, chat_id: chatId, upload_id: uploadId }),
  });
}

/* ---- Ranking ---- */

export function rodarRanking(slug, uploadId, cenario = "C") {
  return request(`/processos/${slug}/ranking`, {
    method: "POST",
    body: JSON.stringify({ upload_id: uploadId, cenario }),
  });
}

/* ---- Resultado ---- */

export function getResultado(slug, uploadId, vaga) {
  const params = new URLSearchParams({ upload_id: uploadId });
  if (vaga) params.append("vaga", vaga);
  return request(`/processos/${slug}/resultado?${params.toString()}`);
}

export function aprovarVaga(slug, uploadId, vaga) {
  return request(`/processos/${slug}/aprovar`, {
    method: "POST",
    body: JSON.stringify({ upload_id: uploadId, vaga }),
  });
}

export function aprovarTudo(slug, uploadId) {
  return request(`/processos/${slug}/aprovar-tudo`, {
    method: "POST",
    body: JSON.stringify({ upload_id: uploadId }),
  });
}

export function moverCandidato(slug, uploadId, candidatoId, deVaga, paraVaga) {
  return request(`/processos/${slug}/mover`, {
    method: "POST",
    body: JSON.stringify({
      upload_id: uploadId,
      candidato_id: candidatoId,
      de_vaga: deVaga,
      para_vaga: paraVaga,
    }),
  });
}

/* ---- Relatorio ---- */

export function gerarRelatorio(slug, uploadId) {
  return request(`/processos/${slug}/relatorio?upload_id=${uploadId}`);
}
