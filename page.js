'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { listarProcessos, criarProcesso, deletarProcesso } from '@/lib/api';
import { useToast } from '@/lib/useToast';

export default function HomePage() {
  const router = useRouter();
  const { addToast } = useToast();
  const [processos, setProcessos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [nome, setNome] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.push('/login'); return; }
      fetchProcessos();
    });
  }, []);

  async function fetchProcessos() {
    try {
      setLoading(true);
      const data = await listarProcessos();
      setProcessos(Array.isArray(data) ? data : []);
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  async function handleCriar(e) {
    e.preventDefault();
    if (!nome.trim()) return;
    try {
      setCreating(true);
      await criarProcesso(nome.trim());
      addToast('Processo criado com sucesso!', 'success');
      setNome('');
      await fetchProcessos();
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setCreating(false);
    }
  }

  async function handleDeletar(slug) {
    if (!confirm(`Tem certeza que deseja excluir o processo "${slug}"? Isso apagará todos os uploads, candidatos e resultados desse processo.`)) return;
    try {
      await deletarProcesso(slug);
      addToast('Processo excluído.', 'success');
      await fetchProcessos();
    } catch (err) {
      addToast(err.message, 'error');
    }
  }

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 80 }}>
        <div style={styles.spinner} />
        <p style={{ color: '#666', marginTop: '1rem' }}>Carregando processos...</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div>
      {/* Welcome section */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: '1.5rem', margin: 0, marginBottom: 6 }}>Processos Seletivos</h1>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', margin: 0, lineHeight: 1.6 }}>
          Aqui você gerencia o ranking e a distribuição de candidatos por vaga.
        </p>
      </div>

      {/* How it works - collapsible */}
      <div className="panel" style={{ marginBottom: 24, padding: '20px 24px' }}>
        <div style={{ fontWeight: 500, fontSize: '0.9rem', marginBottom: 16 }}>
          Como funciona o ranking?
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
          {[
            {
              num: '1',
              title: 'Crie o processo',
              desc: 'Use o nome do cliente (ex: "Bracell", "Ambev"). Esse nome vira o identificador do processo.',
            },
            {
              num: '2',
              title: 'Envie a planilha',
              desc: 'Faça upload do Excel (.xlsx) com todas as informações dos candidatos e do processo seletivo. O sistema lê as vagas e candidatos automaticamente.',
            },
            {
              num: '3',
              title: 'Configure via chat',
              desc: 'Converse com o assistente para definir pesos de acordo com os pré-requisitos do cliente (gênero, localidade, raça, etc.). Após as validações dos critérios, ele irá gerar 3 cenários para você.',
            },
            {
              num: '4',
              title: 'Exporte o relatório',
              desc: 'Faça o upload dos 3 cenários para análise das 3 versões de ranking.',
            },
          ].map((step) => (
            <div key={step.num} style={{ textAlign: 'center' }}>
              <div style={{
                width: 36, height: 36, borderRadius: '50%',
                background: '#EE222B', color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 700, fontSize: '0.9rem', margin: '0 auto 8px',
              }}>{step.num}</div>
              <div style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: 4 }}>{step.title}</div>
              <div style={{ fontSize: '0.8rem', color: '#888', lineHeight: 1.5 }}>{step.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Create new process */}
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: '0.85rem', color: '#888', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          Novo processo
        </h2>
        <form onSubmit={handleCriar} style={{ display: 'flex', gap: 10 }}>
          <input
            className="input"
            placeholder="Nome do cliente ou projeto (ex: Bracell 2025)"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            style={{ flex: 1, maxWidth: 440 }}
          />
          <button className="btn btn-primary" type="submit" disabled={creating}>
            {creating ? 'Criando...' : 'Criar processo'}
          </button>
        </form>
      </div>

      {/* Process list */}
      <h2 style={{ fontSize: '0.85rem', color: '#888', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
        Processos cadastrados
      </h2>

      {processos.length === 0 ? (
        <div className="panel" style={{ textAlign: 'center', padding: 60, color: 'var(--color-text-muted)' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>&#128203;</div>
          <p style={{ fontSize: '1.05rem', fontWeight: 500, color: 'var(--color-text)', marginBottom: 8 }}>
            Nenhum processo criado ainda
          </p>
          <p style={{ fontSize: '0.85rem', maxWidth: 400, margin: '0 auto', lineHeight: 1.6 }}>
            Crie seu primeiro processo usando o campo acima. Use o nome do cliente como identificador — por exemplo, "Bracell" ou "Ambev Q3 2025".
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
          {processos.map((p) => (
            <div
              key={p.slug || p.id}
              className="panel"
              style={{ position: 'relative', cursor: 'pointer', transition: 'border-color 0.15s' }}
              onClick={() => router.push(`/processos/${p.slug}`)}
              onMouseEnter={(e) => e.currentTarget.style.borderColor = '#EE222B'}
              onMouseLeave={(e) => e.currentTarget.style.borderColor = ''}
            >
              <div style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: 6, color: 'var(--color-text)' }}>
                {p.nome || p.slug}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>/{p.slug}</span>
                {p.created_at && (
                  <span style={{ fontSize: '0.75rem', color: '#aaa' }}>
                    &middot; {new Date(p.created_at).toLocaleDateString('pt-BR')}
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <span className="badge">{p.status || 'Ativo'}</span>
                {p.uploads_count != null && (
                  <span className="badge">{p.uploads_count} upload{p.uploads_count !== 1 ? 's' : ''}</span>
                )}
              </div>
              <button
                className="btn btn-danger btn-sm"
                style={{ position: 'absolute', top: 14, right: 14 }}
                onClick={(e) => { e.stopPropagation(); handleDeletar(p.slug); }}
              >
                Excluir
              </button>
            </div>
          ))}
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

const styles = {
  spinner: {
    width: 36,
    height: 36,
    border: '3px solid #eee',
    borderTopColor: '#EE222B',
    borderRadius: '50%',
    animation: 'spin 0.7s linear infinite',
    margin: '0 auto',
  },
};
