import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Activity, Users, LogOut } from 'lucide-react';

export default function Sidebar({ nutriProfile, onLogout }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  return (
    <aside className="sidebar">
      <div className="sidebar-brand" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
        <div className="logo-icon-sm">
          <Activity size={20} strokeWidth={2.5} />
        </div>
        <span className="logo-text">Nutri<span>Care</span></span>
      </div>

      <nav className="sidebar-nav">
        <button
          className={`nav-item ${pathname === '/' ? 'active' : ''}`}
          onClick={() => navigate('/')}
        >
          <Activity size={18} />
          <span>Dashboard</span>
        </button>
        <button
          className={`nav-item ${pathname.startsWith('/pacientes') ? 'active' : ''}`}
          onClick={() => navigate('/pacientes')}
        >
          <Users size={18} />
          <span>Pacientes</span>
        </button>
      </nav>

      <div className="sidebar-footer">
        <div className="user-info">
          <p className="user-name">Dra. {nutriProfile?.nome?.split(' ')[0] || 'Nutri'}</p>
          <p className="user-role">Nutricionista</p>
        </div>
        <button onClick={onLogout} className="btn-logout" title="Sair do Sistema">
          <LogOut size={18} />
        </button>
      </div>
    </aside>
  );
}
