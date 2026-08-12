import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import {
  Sparkles, Users, Calendar, Clock, CheckCircle, ChevronRight
} from 'lucide-react';

export default function Dashboard({ session, nutriProfile }) {
  const navigate = useNavigate();
  const [statsLoading, setStatsLoading] = useState(true);
  const [totalPacientes, setTotalPacientes] = useState(0);
  const [consultasSemana, setConsultasSemana] = useState(0);
  const [pacientesSemRetorno, setPacientesSemRetorno] = useState([]);

  useEffect(() => {
    if (session?.user?.id) fetchStats(session.user.id);
  }, [session]);

  const fetchStats = async (userId) => {
    setStatsLoading(true);
    try {
      const { count } = await supabase
        .from('pacientes')
        .select('*', { count: 'exact', head: true })
        .eq('nutricionista_id', userId);
      setTotalPacientes(count || 0);

      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const { data: consultas } = await supabase
        .from('consultas')
        .select('id, data_consulta, pacientes!inner(nutricionista_id)')
        .eq('pacientes.nutricionista_id', userId)
        .gte('data_consulta', sevenDaysAgo.toISOString().split('T')[0]);
      setConsultasSemana(consultas ? consultas.length : 0);

      const { data: patients } = await supabase
        .from('pacientes')
        .select('id, nome, consultas(id, data_consulta, proximo_retorno)')
        .eq('nutricionista_id', userId);

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const noReturn = [];
      (patients || []).forEach(p => {
        if (p.consultas && p.consultas.length > 0) {
          const latest = p.consultas.reduce((a, b) =>
            new Date(b.data_consulta) > new Date(a.data_consulta) ? b : a
          );
          if (new Date(latest.data_consulta) < thirtyDaysAgo && !latest.proximo_retorno) {
            noReturn.push({ id: p.id, nome: p.nome, ultimaConsulta: latest.data_consulta });
          }
        }
      });
      setPacientesSemRetorno(noReturn);
    } catch (err) {
      console.error('Dashboard stats error:', err);
    } finally {
      setStatsLoading(false);
    }
  };

  return (
    <div className="page-view animate-fade-in">
      <header className="content-header">
        <div>
          <h1>Olá, Dra. {nutriProfile?.nome || 'Nutricionista'}</h1>
          <p className="subtitle">Seja bem-vinda ao seu painel de atendimento NutriCare.</p>
        </div>
        <div className="header-badge">
          <Sparkles size={16} />
          <span>Painel Ativo</span>
        </div>
      </header>

      <section className="welcome-banner">
        <div className="banner-details">
          <h3>Tudo pronto para os atendimentos de hoje!</h3>
          <p>Monitore consultas, gerencie planos alimentares e acompanhe o progresso dos seus pacientes.</p>
        </div>
        <Sparkles className="banner-sparkle-icon" size={28} />
      </section>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-header">
            <div className="stat-icon-wrapper pink"><Users size={24} /></div>
            <span className="stat-label">Total Pacientes</span>
          </div>
          <div className="stat-body">
            {statsLoading ? <div className="skeleton-loader short" /> : <h2>{totalPacientes}</h2>}
            <p className="stat-subtext">Pacientes sob sua gestão</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <div className="stat-icon-wrapper green"><Calendar size={24} /></div>
            <span className="stat-label">Consultas da Semana</span>
          </div>
          <div className="stat-body">
            {statsLoading ? <div className="skeleton-loader short" /> : <h2>{consultasSemana}</h2>}
            <p className="stat-subtext">Últimos 7 dias de atividades</p>
          </div>
        </div>

        <div className="stat-card large-card">
          <div className="stat-header">
            <div className="stat-icon-wrapper dark"><Clock size={24} /></div>
            <span className="stat-label">Pacientes Sem Retorno (&gt;30 dias)</span>
          </div>
          <div className="stat-body">
            {statsLoading ? (
              <div className="skeleton-loader-list">
                <div className="skeleton-loader" />
                <div className="skeleton-loader" />
              </div>
            ) : pacientesSemRetorno.length === 0 ? (
              <div className="empty-state">
                <CheckCircle size={32} className="success-icon" />
                <p>Nenhum paciente sem retorno no momento</p>
              </div>
            ) : (
              <div className="no-return-list">
                {pacientesSemRetorno.map(p => (
                  <div key={p.id} className="no-return-item">
                    <a
                      href={`/pacientes/${p.id}`}
                      className="patient-link"
                      onClick={e => { e.preventDefault(); navigate(`/pacientes/${p.id}`); }}
                    >
                      <span>{p.nome}</span>
                      <ChevronRight size={14} />
                    </a>
                    <span className="last-visit-badge">
                      Última: {new Date(p.ultimaConsulta).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
