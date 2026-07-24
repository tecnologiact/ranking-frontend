'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    router.push('/');
  };

  return (
    <div style={styles.wrapper}>
      {/* Left red panel */}
      <div style={styles.leftPanel}>
        {/* Logo */}
        <div style={styles.logoArea}>
          <div style={styles.logoCircle}>
            <img src="/logo-ct.svg" alt="Cia de Talentos" style={{ width: 32, height: 32 }} />
          </div>
          <span style={styles.logoText}>Cia de Talentos</span>
        </div>

        {/* Content */}
        <div style={styles.leftContent}>
          <h1 style={styles.leftTitle}>Ranking<br />Cia de Talentos</h1>
        </div>

        {/* Footer */}
        <div style={styles.leftFooter}>
          &copy; Cia de Talentos &middot; Ranking &middot; {new Date().getFullYear()}
        </div>
      </div>

      {/* Right form panel */}
      <div style={styles.rightPanel}>
        <div style={styles.formContainer}>
          <h2 style={styles.formTitle}>Acessar Ranking</h2>
          <p style={styles.formSubtitle}>Use suas credenciais da Cia de Talentos</p>

          <form onSubmit={handleSubmit} style={styles.form}>
            <div style={styles.field}>
              <label style={styles.label}>E-mail</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={styles.input}
                placeholder="seu@ciadetalentos.com"
              />
            </div>

            <div style={styles.field}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={styles.label}>Senha</label>
              </div>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  style={styles.input}
                  placeholder="••••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={styles.eyeBtn}
                  tabIndex={-1}
                >
                  {showPassword ? '🙈' : '👁'}
                </button>
              </div>
            </div>

            {error && <p style={styles.error}>{error}</p>}

            <button type="submit" disabled={loading} style={{
              ...styles.button,
              opacity: loading ? 0.7 : 1,
              cursor: loading ? 'not-allowed' : 'pointer',
            }}>
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>

          <p style={styles.footerText}>
            Acesso exclusivo para colaboradores da Cia de Talentos.<br />
            Em caso de dúvidas, fale com o time de TI.
          </p>
        </div>
      </div>
    </div>
  );
}

const styles = {
  wrapper: {
    display: 'flex',
    minHeight: '100vh',
    fontFamily: "'Roboto', sans-serif",
  },

  // ── Left panel ──
  leftPanel: {
    flex: '0 0 40%',
    background: 'linear-gradient(160deg, #EE222B 0%, #c41920 60%, #a01118 100%)',
    color: '#fff',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    padding: '2.5rem',
    position: 'relative',
    overflow: 'hidden',
  },
  logoArea: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  logoCircle: {
    width: 48,
    height: 48,
    borderRadius: '50%',
    background: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 6,
  },
  logoText: {
    fontSize: '1rem',
    fontWeight: 500,
    color: '#fff',
  },
  leftContent: {
    flex: 1,
    display: 'flex',
    alignItems: 'flex-end',
    paddingBottom: '3rem',
  },
  leftTitle: {
    fontSize: '2.8rem',
    fontWeight: 700,
    lineHeight: 1.1,
    margin: 0,
  },
  leftFooter: {
    fontSize: '0.8rem',
    opacity: 0.6,
  },

  // ── Right panel ──
  rightPanel: {
    flex: '0 0 60%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '2rem',
    backgroundColor: '#fff',
  },
  formContainer: {
    width: '100%',
    maxWidth: 420,
  },
  formTitle: {
    fontSize: '1.75rem',
    fontWeight: 700,
    color: '#1a1a1a',
    margin: 0,
  },
  formSubtitle: {
    fontSize: '0.95rem',
    color: '#888',
    marginTop: 8,
    marginBottom: 32,
  },

  // ── Form ──
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  label: {
    fontSize: '0.85rem',
    fontWeight: 500,
    color: '#333',
  },
  input: {
    width: '100%',
    padding: '14px 16px',
    borderRadius: 10,
    border: 'none',
    fontSize: '0.95rem',
    outline: 'none',
    backgroundColor: '#f0f0f3',
    color: '#1a1a1a',
    fontFamily: "'Roboto', sans-serif",
  },
  eyeBtn: {
    position: 'absolute',
    right: 14,
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: '1.1rem',
    padding: 0,
    lineHeight: 1,
  },
  error: {
    color: '#EE222B',
    fontSize: '0.85rem',
    margin: 0,
    textAlign: 'center',
    background: '#fff0f0',
    padding: '10px 14px',
    borderRadius: 8,
  },
  button: {
    backgroundColor: '#EE222B',
    color: '#fff',
    border: 'none',
    borderRadius: 10,
    padding: '14px',
    fontSize: '1rem',
    fontWeight: 600,
    fontFamily: "'Roboto', sans-serif",
    marginTop: 8,
  },
  footerText: {
    fontSize: '0.8rem',
    color: '#aaa',
    textAlign: 'center',
    marginTop: 32,
    lineHeight: 1.6,
  },
};
