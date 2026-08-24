import { supabase } from "./supabase";

// Em dev, usa proxy do Next.js para evitar CORS. Em prod, chama direto.
const IS_DEV =
  typeof window !== "undefined" && window.location.hostname === "localhost";
const API_URL = IS_DEV ? "/api/proxy" : process.env.NEXT_PUBLIC_API_URL;

async function getToken() {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) throw new Error("Usuário não autenticado. Faça login.");
  return token;
}

async function request(path, options = {}) {
  const token = await getToken();
  const headers = { ...options.headers };
  headers["Authorization"] = `Bearer ${token}`;
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
  return json(`/processos?nome=${encodeURIComponent(nome)}`, { method: "POST" });
}

export async function deletarProcesso(slug) {
  return json(`/processos/${slug}`, { method: "DELETE" });
}

// --- Uploads ---

export async function listarUploads(slug) {
  return json(`/processos/${slug}/uploads`);
}

export async function deletarUpload(uploadId) {
  return json(`/uploads/${uploadId}`, { method: "DELETE" });
}

// Upload com barra de progresso e sem timeout artificial — suporta arquivos
// grandes (12MB+, ~35MB). Usa XHR porque fetch não expõe progresso de upload.
export function uploadArquivoComProgresso(slug, arquivo, onProgress) {
  return new Promise(async (resolve, reject) => {
    let token;
    try {
      token = await getToken();
    } catch (e) {
      return reject(e);
    }
    const formData = new FormData();
    formData.append("arquivo", arquivo);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${API_URL}/processos/${slug}/upload`);
    xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    xhr.upload.onprogress = (e) => {
      if (!onProgress) return;
      onProgress(e.lengthComputable ? Math.round((e.loaded / e.total) * 100) : null);
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(xhr.responseText ? JSON.parse(xhr.responseText) : {});
        } catch {
          resolve({});
        }
      } else {
        let detail;
        try {
          detail = JSON.parse(xhr.responseText)?.detail;
        } catch {
          detail = xhr.responseText;
        }
        reject(new Error(detail || `Erro ${xhr.status} ao enviar o arquivo.`));
      }
    };
    xhr.onerror = () =>
      reject(new Error("Erro de rede ao enviar o arquivo. Tente novamente."));
    xhr.send(formData);
  });
}

// --- Chat (CHAT_CONTRACT.md) ---
// Retorna { chat_id, resposta, ferramentas_usadas, dados, acoes }.
// Configurar regras e rodar ranking é SÓ por aqui — não há rota manual.
export async function enviarMensagemChat(slug, { mensagem, chat_id, upload_id }) {
  const body = { mensagem };
  if (chat_id) body.chat_id = chat_id;
  if (upload_id) body.upload_id = upload_id;
  return json(`/processos/${slug}/chat`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

// Lista as conversas existentes de um upload (mais recente primeiro):
// [{ id, nome, criado_em }]
export async function listarConversas(slug, uploadId) {
  return json(`/processos/${slug}/upload/${uploadId}/chats`);
}

// Retoma uma conversa específica: { chat_id, msgs: [{role, content}] }
export async function obterConversa(slug, chatId) {
  return json(`/processos/${slug}/chats/${chatId}`);
}

// --- Downloads autenticados (blob) ---
// baixar:false (padrão vindo do chat) → só busca o blob pra mostrar como aba.
// baixar:true → clique explícito do analista, salva o arquivo no computador.
export async function baixarArquivoAutenticado(caminho, nomeArquivo, { baixar = true } = {}) {
  const res = await request(caminho);
  const blob = await res.blob();
  if (baixar && typeof window !== "undefined") {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = nomeArquivo;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  }
  return blob;
}

export async function baixarRelatorio({ processo, upload_id, cenario }, opcoes) {
  const qs = cenario ? `?cenario=${encodeURIComponent(cenario)}` : "";
  return baixarArquivoAutenticado(
    `/processos/${processo}/upload/${upload_id}/relatorio${qs}`,
    `relatorio_${processo}_${String(upload_id).slice(0, 8)}${cenario ? "_cenario_" + cenario : ""}.xlsx`,
    opcoes
  );
}

export async function baixarPlanilhaEnriquecida({ processo, upload_id }, opcoes) {
  return baixarArquivoAutenticado(
    `/processos/${processo}/upload/${upload_id}/planilha-enriquecida`,
    `planilha_enriquecida_${processo}_${String(upload_id).slice(0, 8)}.xlsx`,
    opcoes
  );
}

// Nome amigável default por tipo de ação (usado no rótulo da aba e no download).
export function nomeArquivoDaAcao(acao) {
  const p = acao?.params || {};
  const up = String(p.upload_id || "").slice(0, 8);
  if (acao?.tipo === "download_relatorio") {
    return `relatorio_${p.processo}_${up}${p.cenario ? "_cenario_" + p.cenario : ""}.xlsx`;
  }
  if (acao?.tipo === "download_planilha_enriquecida") {
    return `planilha_enriquecida_${p.processo}_${up}.xlsx`;
  }
  return "arquivo.xlsx";
}

// Busca o blob de uma ação do chat (sempre baixar:false — só pra mostrar aba).
// baixar:true é usado no clique explícito do analista.
export async function blobDaAcao(acao, { baixar = false } = {}) {
  if (acao?.tipo === "download_relatorio") {
    return baixarRelatorio(acao.params, { baixar });
  }
  if (acao?.tipo === "download_planilha_enriquecida") {
    return baixarPlanilhaEnriquecida(acao.params, { baixar });
  }
  throw new Error(`Ação desconhecida: ${acao?.tipo}`);
}

// --- Resultado / aprovação / movimentação (ainda existem na API) ---

export async function obterResultado(slug, uploadId, vaga) {
  return json(`/processos/${slug}/resultado/${uploadId}/${vaga}`);
}

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
