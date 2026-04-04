'use client';

import { useState, useEffect } from 'react';
import { isAuthenticated, getAllPlayers } from '@/lib/api';
import LoginForm from '@/components/LoginForm';
import Navbar from '@/components/Navbar';
import RankingTable from '@/components/RankingTable';

export default function HomePage() {
  const [authed, setAuthed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [players, setPlayers] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    setAuthed(isAuthenticated());
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!authed) return;

    async function fetchPlayers() {
      try {
        const data = await getAllPlayers();
        setPlayers(data);
      } catch (err) {
        setError('Error al cargar los jugadores.');
        console.error(err);
      }
    }

    fetchPlayers();
  }, [authed]);

  if (loading) {
    return <div className="loading"><div className="spinner" /></div>;
  }

  if (!authed) {
    return <LoginForm onSuccess={() => setAuthed(true)} />;
  }

  const totalGames = players.reduce((sum, p) => sum + (p.wins || 0) + (p.losses || 0) + (p.draws || 0), 0);
  const bestPoints = players.length > 0 ? Math.max(...players.map((p) => p.total_points || 0)) : 0;
  const bestElo = players.length > 0 ? Math.max(...players.map((p) => p.current_elo || 1200)) : 1200;

  return (
    <>
      <Navbar />
      <main className="page-container">
        <div className="page-header">
          <h1 className="page-title">🏆 Ranking Global</h1>
          <p className="page-subtitle">
            Clasificación de jugadores · Puntos = Σ(Resultado × ELO Motor)
          </p>
        </div>

        <div className="stats-grid" style={{ marginBottom: '2rem' }}>
          <div className="stat-card">
            <div className="stat-card-label">Jugadores</div>
            <div className="stat-card-value purple">{players.length}</div>
          </div>
          <div className="stat-card">
            <div className="stat-card-label">Total Partidas</div>
            <div className="stat-card-value blue">{totalGames}</div>
          </div>
          <div className="stat-card">
            <div className="stat-card-label">Mejor Puntuación</div>
            <div className="stat-card-value gold">{bestPoints.toLocaleString()}</div>
          </div>
          <div className="stat-card">
            <div className="stat-card-label">Mayor ELO</div>
            <div className="stat-card-value green">{bestElo}</div>
          </div>
        </div>

        {error && <p style={{ color: 'var(--accent-red)', textAlign: 'center' }}>{error}</p>}

        <RankingTable players={players} />
      </main>
    </>
  );
}
