'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { isAuthenticated, getAllGames, getAllPlayers } from '@/lib/api';
import Navbar from '@/components/Navbar';

export default function GamesPage() {
  const [authed, setAuthed] = useState(false);
  const [checking, setChecking] = useState(true);
  const [games, setGames] = useState([]);
  const [users, setUsers] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const auth = isAuthenticated();
    setAuthed(auth);
    setChecking(false);

    if (!auth) return;

    async function fetchData(isRefresh = false) {
      if (isRefresh) setLoading(false); // Don't show full screen loader on manual refresh
      try {
        const [gamesData, playersData] = await Promise.all([
          getAllGames(),
          getAllPlayers(),
        ]);
        
        // Sort games: in_progress first, then by date
        const sortedGames = [...gamesData].sort((a, b) => {
          if (a.result === 'in_progress' && b.result !== 'in_progress') return -1;
          if (a.result !== 'in_progress' && b.result === 'in_progress') return 1;
          return new Date(b.finished_at || b.started_at || 0) - new Date(a.finished_at || a.started_at || 0);
        });
        
        setGames(sortedGames);

        const userMap = {};
        playersData.forEach((u) => { userMap[u.id] = u; });
        setUsers(userMap);
      } catch (err) {
        console.error('Error fetching data:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
    
    // Auto-refresh every 20 seconds
    const interval = setInterval(() => fetchData(true), 20000);
    return () => clearInterval(interval);
  }, []);

  if (checking) return <div className="loading"><div className="spinner" /></div>;

  if (!authed) {
    if (typeof window !== 'undefined') window.location.href = '/chess/';
    return null;
  }

  return (
    <>
      <Navbar />
      <main className="page-container">
        <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 className="page-title">♟️ Partidas</h1>
            <p className="page-subtitle">
              Todas las partidas jugadas · Haz clic para ver el tablero
            </p>
          </div>
          <button 
            onClick={() => window.location.reload()} 
            className="viewer-btn"
            style={{ padding: '0.6rem 1.2rem', fontSize: '0.9rem' }}
          >
            🔄 Actualizar
          </button>
        </div>

        {loading ? (
          <div className="loading"><div className="spinner" /></div>
        ) : games.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">♟️</div>
            <p>No hay partidas registradas aún.</p>
          </div>
        ) : (
          <div className="games-grid stagger">
            {games.map((game) => {
              const player = users[game.player_id];
              const isLive = game.result === 'in_progress';
              return (
                <Link 
                  key={game.id} 
                  href={`/game?id=${game.id}`} 
                  className={`game-card animate-in ${isLive ? 'live-border' : ''}`} 
                  style={{ opacity: 1, border: isLive ? '2px solid var(--accent-red)' : 'none' }}
                >
                  <div className="game-card-header">
                    <span className={`game-result-badge ${game.result}`}>
                      {isLive ? '🔴 EN VIVO' : game.result === 'win' ? 'Victoria' : game.result === 'loss' ? 'Derrota' : 'Tablas'}
                    </span>
                    <span className="game-card-elo">ELO {game.engine_elo}</span>
                  </div>
                  <div style={{ margin: '0.5rem 0', fontSize: '0.9rem', fontWeight: 500 }}>
                    {player?.name || 'Jugador desconocido'}
                  </div>
                  <div className="game-card-meta">
                    <span>{game.moves_count || '0'} jugadas</span>
                    <span>
                      {game.finished_at || game.started_at
                        ? new Date(game.finished_at || game.started_at).toLocaleDateString('es-ES', {
                            day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                          })
                        : 'Fecha desconocida'}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </>
  );
}
