import { supabase } from "./supabase";

// Em dev, usa proxy do Next.js para evitar CORS. Em prod, chama direto.
const IS_DEV = typeof window !== "undefined" && window.location.hostname === "localhost";
const API_URL = IS_DEV ? "/api/proxy" : process.env.NEXT_PUBLIC_API_URL;

async function request(path, options = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) throw new Error("Usuário não autenticado. Faça login.");

  const headers = { ...options.headers };
  headers["Authorization"] = `Bearer ${token}`;

  // Don't set Content-Type for FormData (let browser set multipart boundary)
  if (!(options.body instanceof FormData) && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    let detail;
    try {
      detail = JSON.parse(text)?.detail;
    } catch {
      detail = text;
    }
    throw new Error(detail || `Erro ${res.status}`);
  }

  return res;
}

async function json(path, options) {
  const res = await request(path, options);
  return res.json();
}

// --- Processos ---

export async function listarProcessos() {
  return json("/processos");
}

export async function criarProcesso(nome) {
  return json(`/processos?nome=${encodeURIComponent(nome)}`, {
    method: "POST",
  });
}

export async function deletarProcesso(slug) {
  return json(`/processos/${slug}`, { method: "DELETE" });
}

// --- Uploads ---

export async function uploadArquivo(slug, arquivo) {
  const formData = new FormData();
  formData.append("arquivo", arquivo);
  return json(`/processos/${slug}/upload`, {
    method: "POST",
    body: formData,
  });
}

export async function listarUploads(slug) {
  return json(`/processos/${slug}/uploads`);
}

export async function deletarUpload(uploadId) {
  return json(`/uploads/${uploadId}`, { method: "DELETE" });
}

// --- Regras ---

export async function obterRegras(slug, uploadId) {
  return json(`/processos/${slug}/regras?upload_id=${uploadId}`);
}

export async function salvarRegras(slug, uploadId, regras) {
  return json(`/processos/${slug}/regras?upload_id=${uploadId}`, {
    method: "POST",
    body: JSON.stringify(regras),
  });
}

// --- Chat ---

export async function enviarMensagemChat(slug, { mensagem, chat_id, upload_id }) {
  const body = { mensagem };
  if (chat_id) body.chat_id = chat_id;
  if (upload_id) body.upload_id = upload_id;
  return json(`/processos/${slug}/chat`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

// --- Ranking ---

export async function rodarRanking(slug, uploadId, cenario) {
  return json(
    `/processos/${slug}/rodar?upload_id=${uploadId}&cenario=${encodeURIComponent(cenario)}`,
    { method: "POST" }
  );
}

// --- Resultado ---

export async function obterResultado(slug, uploadId, vaga) {
  return json(`/processos/${slug}/resultado/${uploadId}/${vaga}`);
}

// --- Aprovar ---

export async function aprovarVaga(slug, uploadId, vaga) {
  return json(`/processos/${slug}/upload/${uploadId}/vaga/${vaga}/aprovar`, {
    method: "POST",
  });
}

export async function aprovarTudo(slug, uploadId) {
  return json(`/processos/${slug}/upload/${uploadId}/aprovar-tudo`, {
    method: "POST",
  });
}

// --- Mover candidato ---

export async function moverCandidato(slug, uploadId, { candidato_codigo, vaga_destino, motivo }) {
  const params = new URLSearchParams({
    candidato_codigo: String(candidato_codigo),
    vaga_destino: String(vaga_destino),
    motivo,
  });
  return json(`/processos/${slug}/upload/${uploadId}/mover-candidato?${params}`, {
    method: "POST",
  });
}

// --- Relatório ---

export async function baixarRelatorio(slug, uploadId, cenario) {
  const params = cenario ? `?cenario=${encodeURIComponent(cenario)}` : "";
  const res = await request(`/processos/${slug}/upload/${uploadId}/relatorio${params}`);
  return res.blob();
}
