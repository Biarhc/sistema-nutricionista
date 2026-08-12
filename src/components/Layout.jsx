import React from 'react';
import Sidebar from './Sidebar';

export default function Layout({ children, nutriProfile, onLogout }) {
  return (
    <div className="app-layout">
      <Sidebar nutriProfile={nutriProfile} onLogout={onLogout} />
      <main className="main-content">
        {children}
      </main>
    </div>
  );
}
