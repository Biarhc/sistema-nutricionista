import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './supabaseClient';
import {
  LogIn, UserPlus, Mail, Lock, User,
  CheckCircle, AlertTriangle, Activity
} from 'lucide-react';

import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Pacientes from './pages/Pacientes';
import PacienteNovo from './pages/PacienteNovo';
import PacienteDetalhes from './pages/PacienteDetalhes';

function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [nutriProfile, setNutriProfile] = useState(null);

  // Auth form states
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [nome, setNome] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchProfile(session.user.id);
      setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) fetchProfile(session.user.id);
      else setNutriProfile(null);
      setLoading(false);
    });
    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId) => {
    const { data } = await supabase
      .from('nutricionistas').select('*').eq('id', userId).single();
    if (data) setNutriProfile(data);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMsg(''); setSuccessMsg(''); setActionLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      if (data?.user) {
        const { data: existing } = await supabase
          .from('nutricionistas').select('id').eq('id', data.user.id).single();
        if (!existing) {
          const fallback = nome || data.user.user_metadata?.nome || email.split('@')[0];
          await supabase.from('nutricionistas').insert([{ id: data.user.id, nome: fallback, email }]);
        }
        await fetchProfile(data.user.id);
        setSuccessMsg('Login realizado com sucesso!');
      }
    } catch (err) {
      setErrorMsg(err.message || 'Falha ao autenticar. Verifique suas credenciais.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setErrorMsg(''); setSuccessMsg(''); setActionLoading(true);
    if (password.length < 6) { setErrorMsg('A senha deve ter no mínimo 6 caracteres.'); setActionLoading(false); return; }
    if (password !== confirmPassword) { setErrorMsg('As senhas não coincidem.'); setActionLoading(false); return; }
    try {
      const { data, error } = await supabase.auth.signUp({
        email, password, options: { data: { nome } }
      });
      if (error) throw error;
      if (data?.user) {
        await supabase.from('nutricionistas').insert([{ id: data.user.id, nome, email }]);
        if (data.session) {
          setSession(data.session);
          await fetchProfile(data.user.id);
          setSuccessMsg('Conta criada com sucesso!');
        } else {
          setSuccessMsg('Verifique seu e-mail para confirmação.');
        }
      }
    } catch (err) {
      setErrorMsg(err.message || 'Erro ao criar conta. Tente novamente.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setNutriProfile(null);
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner" />
        <p>Carregando sistema...</p>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="auth-container">
        <div className="logo-container">
          <div className="logo-icon">
            <Activity size={32} strokeWidth={2.5} />
          </div>
          <span className="logo-text">Nutri<span>Care</span></span>
        </div>

        <h2 className="auth-title">
          {isRegistering ? 'Crie sua conta profissional' : 'Bem-vinda de volta'}
        </h2>
        <p className="auth-subtitle">
          {isRegistering
            ? 'Preencha seus dados para iniciar a gestão dos seus pacientes.'
            : 'Entre com suas credenciais para acessar o painel administrativo.'
          }
        </p>

        {errorMsg && (
          <div className="alert alert-error">
            <AlertTriangle size={18} /> {errorMsg}
          </div>
        )}
        {successMsg && (
          <div className="alert alert-success">
            <CheckCircle size={18} /> {successMsg}
          </div>
        )}

        <form onSubmit={isRegistering ? handleRegister : handleLogin}>
          {isRegistering && (
            <div className="form-group">
              <label className="form-label">Nome Completo</label>
              <div className="input-wrapper">
                <User className="input-icon" size={18} />
                <input type="text" className="form-input" placeholder="Dra. Beatriz Oliveira"
                  value={nome} onChange={e => setNome(e.target.value)} required />
              </div>
            </div>
          )}

          <div className="form-group">
            <label className="form-label">E-mail</label>
            <div className="input-wrapper">
              <Mail className="input-icon" size={18} />
              <input type="email" className="form-input" placeholder="seuemail@exemplo.com"
                value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Senha</label>
            <div className="input-wrapper">
              <Lock className="input-icon" size={18} />
              <input type="password" className="form-input" placeholder="••••••"
                value={password} onChange={e => setPassword(e.target.value)} required minLength={6} />
            </div>
          </div>

          {isRegistering && (
            <div className="form-group">
              <label className="form-label">Confirmar Senha</label>
              <div className="input-wrapper">
                <Lock className="input-icon" size={18} />
                <input type="password" className="form-input" placeholder="••••••"
                  value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required minLength={6} />
              </div>
            </div>
          )}

          <button
            type="submit"
            className="btn-primary"
            disabled={actionLoading}
            style={isRegistering ? {} : { backgroundColor: '#8BA33E' }}
          >
            {actionLoading ? 'Processando...' : isRegistering ? 'Criar conta' : 'Entrar'}
          </button>
        </form>

        <div className="auth-footer">
          {isRegistering ? (
            <>Já tem conta? <a href="#" className="auth-link" onClick={e => { e.preventDefault(); setIsRegistering(false); setErrorMsg(''); setSuccessMsg(''); }}>Faça login</a></>
          ) : (
            <>Não tem conta? <a href="#" className="auth-link" onClick={e => { e.preventDefault(); setIsRegistering(true); setErrorMsg(''); setSuccessMsg(''); }}>Cadastre-se</a></>
          )}
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Layout nutriProfile={nutriProfile} onLogout={handleLogout}>
        <Routes>
          <Route path="/" element={<Dashboard session={session} nutriProfile={nutriProfile} />} />
          <Route path="/pacientes" element={<Pacientes session={session} />} />
          <Route path="/pacientes/novo" element={<PacienteNovo session={session} />} />
          <Route path="/pacientes/:id" element={<PacienteDetalhes session={session} />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

export default App;
