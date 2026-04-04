'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { isAuthenticated, getPlayerById, getPlayerGames } from '@/lib/api';
import Navbar from '@/components/Navbar';
import StatsChart from '@/components/StatsChart';
import { Suspense } from 'react';

function PlayerContent() {
  const searchParams = useSearchParams();
  const playerId = searchParams.get('id');

  const [player, setPlayer] = useState(null);
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!playerId) { setLoading(false); return; }

    async function fetchData() {
      try {
        const [playerData, gamesData] = await Promise.all([
          getPlayerById(playerId),
          getPlayerGames(playerId),
        ]);
        setPlayer(playerData);
        setGames(gamesData);
      } catch (err) {
        console.error('Error fetching player:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [playerId]);

  if (loading) {
    return <div className="loading"><div className="spinner" /></div>;
  }

  if (!playerId || !player) {
    return (
      <main className="page-container">
        <div className="empty-state">
          <div className="empty-state-icon">❓</div>
          <p>Jugador no encontrado.</p>
          <Link href="/" className="back-link" style={{ display: 'inline-flex', marginTop: '1rem' }}>
            ← Volver al ranking
          </Link>
        </div>
      </main>
    );
  }

  const totalGames = (player.wins || 0) + (player.losses || 0) + (player.draws || 0);
  const winRate = totalGames > 0 ? Math.round(((player.wins || 0) / totalGames) * 100) : 0;
  const finishedGames = games.filter((g) => g.result !== 'in_progress');

  return (
    <main className="page-container">
      <Link href="/" className="back-link">← Volver al ranking</Link>

      <div className="card" style={{ marginBottom: '2rem', padding: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
          <div className="player-avatar" style={{
            width: '72px', height: '72px', fontSize: '1.5rem',
            background: 'var(--gradient-primary)',
          }}>
            {(player.name || '?')[0].toUpperCase()}
          </div>
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.25rem' }}>
              {player.name}
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              Miembro desde {new Date(player.created_at).toLocaleDateString('es-ES', {
                year: 'numeric', month: 'long', day: 'numeric',
              })}
            </p>
          </div>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-card-label">Puntos Totales</div>
          <div className="stat-card-value gold">{(player.total_points || 0).toLocaleString()}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">ELO Actual</div>
          <div className="stat-card-value purple">{player.current_elo || 1200}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">Victorias</div>
          <div className="stat-card-value green">{player.wins || 0}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">Derrotas</div>
          <div className="stat-card-value red">{player.losses || 0}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">Tablas</div>
          <div className="stat-card-value blue">{player.draws || 0}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">Win Rate</div>
          <div className="stat-card-value" style={{ color: winRate >= 50 ? 'var(--accent-green)' : 'var(--accent-red)' }}>
            {winRate}%
          </div>
        </div>
      </div>

      <StatsChart games={finishedGames} />

      <div style={{ marginTop: '2rem' }}>
        <h3 style={{
          fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase',
          letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '1rem',
        }}>
          Partidas recientes
        </h3>

        {finishedGames.length === 0 ? (
          <div className="empty-state"><p>No hay partidas terminadas aún.</p></div>
        ) : (
          <div className="games-grid">
            {finishedGames.slice(0, 12).map((game) => (
              <Link key={game.id} href={`/game?id=${game.id}`} className="game-card">
                <div className="game-card-header">
                  <span className={`game-result-badge ${game.result}`}>
                    {game.result === 'win' ? 'Victoria' : game.result === 'loss' ? 'Derrota' : 'Tablas'}
                  </span>
                  <span className="game-card-elo">ELO {game.engine_elo}</span>
                </div>
                <div className="game-card-meta">
                  <span>{game.moves_count || '?'} jugadas</span>
                  <span>
                    {game.finished_at
                      ? new Date(game.finished_at).toLocaleDateString('es-ES', {
                          day: 'numeric', month: 'short',
                        })
                      : 'En curso'}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

export default function PlayerPage() {
  const [authed, setAuthed] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    setAuthed(isAuthenticated());
    setChecking(false);
  }, []);

  if (checking) return <div className="loading"><div className="spinner" /></div>;

  if (!authed) {
    if (typeof window !== 'undefined') window.location.href = '/chess/';
    return null;
  }

  return (
    <>
      <Navbar />
      <Suspense fallback={<div className="loading"><div className="spinner" /></div>}>
        <PlayerContent />
      </Suspense>
    </>
  );
}
