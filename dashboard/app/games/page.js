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

    async function fetchData() {
      try {
        const [gamesData, playersData] = await Promise.all([
          getAllGames(),
          getAllPlayers(),
        ]);
        setGames(gamesData);

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
        <div className="page-header">
          <h1 className="page-title">♟️ Partidas</h1>
          <p className="page-subtitle">
            Todas las partidas jugadas · Haz clic para ver el tablero
          </p>
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
              return (
                <Link key={game.id} href={`/game?id=${game.id}`} className="game-card animate-in" style={{ opacity: 0 }}>
                  <div className="game-card-header">
                    <span className={`game-result-badge ${game.result}`}>
                      {game.result === 'win' ? 'Victoria' : game.result === 'loss' ? 'Derrota' : game.result === 'draw' ? 'Tablas' : 'En vivo'}
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
