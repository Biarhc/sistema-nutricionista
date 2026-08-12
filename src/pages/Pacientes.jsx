import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { Search, UserPlus, User, Calendar, ChevronRight } from 'lucide-react';

export default function Pacientes({ session }) {
  const navigate = useNavigate();
  const [pacientes, setPacientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (session?.user?.id) fetchPacientes();
  }, [session]);

  const fetchPacientes = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('pacientes')
        .select('id, nome, objetivos, objetivo_texto, consultas(id, data_consulta)')
        .eq('nutricionista_id', session.user.id)
        .order('nome', { ascending: true });
      if (error) throw error;
      setPacientes(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getUltimaConsulta = (consultas) => {
    if (!consultas || consultas.length === 0) return null;
    return consultas.reduce((a, b) =>
      new Date(b.data_consulta) > new Date(a.data_consulta) ? b : a
    ).data_consulta;
  };

  const getObjetivo = (p) => {
    if (p.objetivo_texto) return p.objetivo_texto;
    if (p.objetivos && p.objetivos.length > 0) return p.objetivos[0];
    return 'Não informado';
  };

  const filtered = pacientes.filter(p =>
    p.nome.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="page-view animate-fade-in">
      <header className="content-header">
        <div>
          <h1>Pacientes</h1>
          <p className="subtitle">Gerencie os pacientes cadastrados no sistema.</p>
        </div>
        <button className="btn-new-patient" onClick={() => navigate('/pacientes/novo')}>
          <UserPlus size={18} />
          Novo Paciente
        </button>
      </header>

      <div className="search-bar-wrapper">
        <Search size={18} className="search-icon" />
        <input
          type="text"
          className="search-input"
          placeholder="Buscar paciente por nome..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="patients-loading">
          {[1, 2, 3, 4].map(i => <div key={i} className="patient-row-skeleton" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-patients">
          <User size={52} />
          <h3>{search ? 'Nenhum paciente encontrado' : 'Nenhum paciente cadastrado ainda'}</h3>
          {!search && (
            <p>Clique em <strong>Novo Paciente</strong> para começar.</p>
          )}
        </div>
      ) : (
        <div className="patients-list">
          {filtered.map(p => {
            const ultima = getUltimaConsulta(p.consultas);
            return (
              <div
                key={p.id}
                className="patient-row"
                onClick={() => navigate(`/pacientes/${p.id}`)}
              >
                <div className="patient-avatar">
                  {p.nome.charAt(0).toUpperCase()}
                </div>
                <div className="patient-info">
                  <span className="patient-name">{p.nome}</span>
                  <span className="patient-objetivo">{getObjetivo(p)}</span>
                </div>
                <div className="patient-meta">
                  <div className="patient-last-consult">
                    <Calendar size={14} />
                    {ultima
                      ? new Date(ultima).toLocaleDateString('pt-BR')
                      : 'Sem consultas'
                    }
                  </div>
                </div>
                <ChevronRight size={18} className="patient-arrow" />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
