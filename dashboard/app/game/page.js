'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { isAuthenticated, getGameById, getPlayerById } from '@/lib/api';
import Navbar from '@/components/Navbar';
import ChessViewer from '@/components/ChessViewer';
import { Suspense } from 'react';

function GameContent() {
  const searchParams = useSearchParams();
  const gameId = searchParams.get('id');

  const [game, setGame] = useState(null);
  const [player, setPlayer] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!gameId) { setLoading(false); return; }

    async function fetchData() {
      try {
        const gameData = await getGameById(gameId);
        setGame(gameData);
        if (gameData?.player_id) {
          const playerData = await getPlayerById(gameData.player_id);
          setPlayer(playerData);
        }
      } catch (err) {
        console.error('Error fetching game:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
    
    // Auto-refresh every 10 seconds if game is in_progress
    let intervalId;
    if (game && game.result === 'in_progress') {
      intervalId = setInterval(fetchData, 10000);
    }
    
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [gameId, game?.result]);

  if (loading) {
    return <div className="loading"><div className="spinner" /></div>;
  }

  if (!gameId || !game) {
    return (
      <main className="page-container">
        <div className="empty-state">
          <div className="empty-state-icon">❓</div>
          <p>Partida no encontrada.</p>
          <Link href="/" className="back-link" style={{ display: 'inline-flex', marginTop: '1rem' }}>
            ← Volver al ranking
          </Link>
        </div>
      </main>
    );
  }

  const resultLabel = game.result === 'win' ? 'Victoria' : game.result === 'loss' ? 'Derrota' : game.result === 'draw' ? 'Tablas' : 'En curso';

  return (
    <main className="page-container">
      <Link href={player ? `/player?id=${player.id}` : '/'} className="back-link">
        ← Volver a {player ? player.name : 'ranking'}
      </Link>

      <div className="page-header" style={{ textAlign: 'left' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <h1 className="page-title" style={{ fontSize: '1.5rem' }}>
            {player?.name || 'Jugador'} vs Motor ELO {game.engine_elo}
          </h1>
          <span className={`game-result-badge ${game.result}`}>{resultLabel}</span>
        </div>
        <p className="page-subtitle" style={{ marginTop: '0.5rem' }}>
          {game.moves_count || 0} jugadas · {game.started_at
            ? new Date(game.started_at).toLocaleDateString('es-ES', {
                year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit',
              })
            : 'Fecha desconocida'}
        </p>
      </div>

      <ChessViewer
        pgn={game.pgn}
        playerName={player?.name}
        engineElo={game.engine_elo}
        result={game.result}
      />
    </main>
  );
}

export default function GamePage() {
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
        <GameContent />
      </Suspense>
    </>
  );
}
