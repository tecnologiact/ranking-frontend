# Notas para o backend — o que o front NÃO resolve sozinho

Contexto: o backend já entregou a maior parte da evolução **por dentro dos
endpoints existentes** (chat-agent + regras ricas). O front foi redesenhado para
ser chat-centrado. Sobraram poucos pontos que só o backend fecha:

## 1. Bug confirmado: nota (`score`) não vai para o resultado ⛔ backend
Nos resultados gravados (`ranking_gerados.resultado`), cada candidato vem com
`"score": null`, **mas a nota existe** em `ranking_candidatos.score`
(ex.: 69.61, 69.30). Ou seja: o cálculo/relacionamento existe, mas o `score` não
está sendo copiado para o objeto do resultado (nem para o relatório).

- **Correção:** ao montar o `resultado` de cada vaga, trazer o `score` do
  candidato (e, quando houver assessments, a média ponderada) para dentro de
  cada item. O front já exibe qualquer coluna que vier no resultado — assim que
  o `score` vier preenchido, ele aparece automaticamente na tela e no relatório.

## 2. Colunas da base no relatório 🟡 backend
O front passou a **ler as colunas do arquivo no navegador** (item 1) — isso não
depende de vocês. Mas para as **colunas extras aparecerem no relatório Excel** e
no `resultado` por vaga, o backend precisa incluí-las na montagem (hoje o
resultado traz um subconjunto fixo: nome, tier, score, genero, status, posicao,
curso_ok, localidade, autodeclaracao, ingles_declarado...).

## 3. Arquivos grandes (12MB / ~35MB Vale) ⛔ infra
O front agora envia com barra de progresso e **sem limite/timeout artificial**.
Falta garantir no servidor (Easypanel/uvicorn + proxy):
- limite de body ≥ 50MB;
- timeout de request suficiente para processar a planilha;
- memória adequada no parsing.

## 4. (Opcional) Upload devolver metadados 🟡 backend
Se o `POST /processos/{slug}/upload` devolver no JSON `total_candidatos`,
`total_vagas` e (se quiser) a lista de colunas detectadas do lado do servidor, o
painel usa direto. Hoje o front já cobre as colunas pelo arquivo, então isso é
só um "nice to have".

---

## O que mudou no FRONT (já feito, aguardando deploy)
- Base do backend apontada para o Easypanel (falta setar a env `NEXT_PUBLIC_API_URL`
  na Vercel — ver mensagem).
- Leitura das colunas do arquivo no navegador (SheetJS, carregado sob demanda).
- Upload com barra de progresso, preparado para arquivos grandes.
- Tela de configuração redesenhada: **chat como centro de controle**; painel
  lateral virou espelho do estado (arquivo, colunas detectadas, regras).
- **Cenário A/B/C aposentado** como escolha do usuário — a estratégia vem das
  regras definidas no chat (o front ainda manda um default silencioso para o
  `/rodar`, que continua usando esse eixo internamente).
- Chips de sugestão no chat para os fluxos novos (explicar coluna, cotas,
  priorizar por nota, repescagem, pesos de assessment, estudo de flexibilização,
  simulação "e se eu flexibilizar?").
- Regras ricas renderizadas sem `[object Object]` (cotas customizadas, cotas por
  vaga, repescagem).
