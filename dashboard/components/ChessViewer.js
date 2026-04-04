'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Chessboard } from 'react-chessboard';
import { Chess } from 'chess.js';

export default function ChessViewer({ pgn, playerName, engineElo, result }) {
  const [currentMoveIndex, setCurrentMoveIndex] = useState(-1);
  const [boardWidth, setBoardWidth] = useState(480);

  // Parse PGN and get all moves
  const { moves, positions } = useMemo(() => {
    const game = new Chess();
    const movesList = [];
    const positionsList = [game.fen()]; // Starting position

    if (pgn) {
      try {
        game.loadPgn(pgn);
        const history = game.history({ verbose: true });

        // Reset and replay to build positions array
        game.reset();
        for (const move of history) {
          game.move(move.san);
          movesList.push(move);
          positionsList.push(game.fen());
        }
      } catch (e) {
        console.error('Error parsing PGN:', e);
      }
    }

    return { moves: movesList, positions: positionsList };
  }, [pgn]);

  // Default to the last move when PGN is loaded/updated
  useEffect(() => {
    if (moves.length > 0) {
      setCurrentMoveIndex(moves.length - 1);
    } else {
      setCurrentMoveIndex(-1);
    }
  }, [moves]);

  const currentFen = positions[currentMoveIndex + 1] || positions[0];

  // Responsive board size
  useEffect(() => {
    function handleResize() {
      const container = document.querySelector('.board-container');
      if (container) {
        const width = Math.min(container.clientWidth, 560);
        setBoardWidth(width);
      }
    }

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const goToStart = useCallback(() => setCurrentMoveIndex(-1), []);
  const goToEnd = useCallback(() => setCurrentMoveIndex(moves.length - 1), [moves.length]);
  const goBack = useCallback(() => setCurrentMoveIndex((i) => Math.max(-1, i - 1)), []);
  const goForward = useCallback(() => setCurrentMoveIndex((i) => Math.min(moves.length - 1, i + 1)), [moves.length]);

  // Keyboard navigation
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'ArrowLeft') { e.preventDefault(); goBack(); }
      if (e.key === 'ArrowRight') { e.preventDefault(); goForward(); }
      if (e.key === 'Home') { e.preventDefault(); goToStart(); }
      if (e.key === 'End') { e.preventDefault(); goToEnd(); }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goBack, goForward, goToStart, goToEnd]);

  // Group moves into pairs (white, black)
  const movePairs = [];
  for (let i = 0; i < moves.length; i += 2) {
    movePairs.push({
      number: Math.floor(i / 2) + 1,
      white: moves[i],
      black: moves[i + 1] || null,
      whiteIndex: i,
      blackIndex: i + 1,
    });
  }

  const resultLabel = result === 'win' ? '1-0' : result === 'loss' ? '0-1' : result === 'draw' ? '½-½' : '';

  return (
    <div className="chess-viewer">
      <div>
        {/* Game info */}
        <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              ⬜ {playerName || 'Jugador'} vs ⬛ Motor ELO {engineElo || '?'}
            </span>
          </div>
          {resultLabel && (
            <span className={`game-result-badge ${result}`}>{resultLabel}</span>
          )}
        </div>

        {/* Board */}
        <div className="board-container">
          <Chessboard
            id="pgn-viewer-board"
            position={currentFen}
            boardWidth={boardWidth}
            arePiecesDraggable={false}
            customBoardStyle={{
              borderRadius: '8px',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
            }}
            customDarkSquareStyle={{ backgroundColor: '#6c5ce7' }}
            customLightSquareStyle={{ backgroundColor: '#d1c4e9' }}
          />
        </div>

        {/* Controls */}
        <div className="viewer-controls">
          <button className="viewer-btn" onClick={goToStart} disabled={currentMoveIndex <= -1} title="Inicio">
            ⏮
          </button>
          <button className="viewer-btn" onClick={goBack} disabled={currentMoveIndex <= -1} title="Anterior">
            ◀
          </button>
          <button className="viewer-btn" onClick={goForward} disabled={currentMoveIndex >= moves.length - 1} title="Siguiente">
            ▶
          </button>
          <button className="viewer-btn" onClick={goToEnd} disabled={currentMoveIndex >= moves.length - 1} title="Final">
            ⏭
          </button>
        </div>

        <div style={{ textAlign: 'center', marginTop: '0.75rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
          Jugada {currentMoveIndex + 1} de {moves.length} · ← → para navegar
        </div>
      </div>

      {/* Move list panel */}
      <div className="move-list-panel">
        <div className="move-list-title">Movimientos</div>

        <div className="move-list">
          {movePairs.length === 0 ? (
            <div className="empty-state" style={{ padding: '1rem' }}>
              <p style={{ fontSize: '0.85rem' }}>No hay movimientos.</p>
            </div>
          ) : (
            movePairs.map((pair) => (
              <div key={pair.number} className="move-row">
                <span className="move-number">{pair.number}.</span>
                <span
                  className={`move-san ${currentMoveIndex === pair.whiteIndex ? 'active' : ''}`}
                  onClick={() => setCurrentMoveIndex(pair.whiteIndex)}
                >
                  {pair.white.san}
                </span>
                {pair.black && (
                  <span
                    className={`move-san ${currentMoveIndex === pair.blackIndex ? 'active' : ''}`}
                    onClick={() => setCurrentMoveIndex(pair.blackIndex)}
                  >
                    {pair.black.san}
                  </span>
                )}
              </div>
            ))
          )}
        </div>

        {resultLabel && (
          <div style={{
            textAlign: 'center',
            padding: '0.75rem 0 0',
            marginTop: 'auto',
            borderTop: '1px solid var(--border-color)',
            fontWeight: 700,
            fontSize: '1.1rem',
            fontFamily: 'var(--font-mono)',
            color: result === 'win' ? 'var(--accent-green)' : result === 'loss' ? 'var(--accent-red)' : 'var(--accent-blue)',
          }}>
            {resultLabel}
          </div>
        )}
      </div>
    </div>
  );
}
