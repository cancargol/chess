'use client';

import { useMemo } from 'react';

/**
 * CustomChessboard: A native React 19 chessboard renderer that doesn't 
 * rely on external chess libraries for the UI.
 * 
 * Works purely from a FEN string.
 */
export default function CustomChessboard({ position, boardWidth = 480 }) {
  const PIECE_IMAGES = {
    // White pieces
    'K': 'https://upload.wikimedia.org/wikipedia/commons/4/42/Chess_klt45.svg',
    'Q': 'https://upload.wikimedia.org/wikipedia/commons/1/15/Chess_qlt45.svg',
    'R': 'https://upload.wikimedia.org/wikipedia/commons/7/72/Chess_rlt45.svg',
    'B': 'https://upload.wikimedia.org/wikipedia/commons/b/b1/Chess_blt45.svg',
    'N': 'https://upload.wikimedia.org/wikipedia/commons/7/70/Chess_nlt45.svg',
    'P': 'https://upload.wikimedia.org/wikipedia/commons/4/45/Chess_plt45.svg',
    // Black pieces
    'k': 'https://upload.wikimedia.org/wikipedia/commons/f/f0/Chess_kdt45.svg',
    'q': 'https://upload.wikimedia.org/wikipedia/commons/4/47/Chess_qdt45.svg',
    'r': 'https://upload.wikimedia.org/wikipedia/commons/f/ff/Chess_rdt45.svg',
    'b': 'https://upload.wikimedia.org/wikipedia/commons/9/98/Chess_bdt45.svg',
    'n': 'https://upload.wikimedia.org/wikipedia/commons/e/ef/Chess_ndt45.svg',
    'p': 'https://upload.wikimedia.org/wikipedia/commons/c/c7/Chess_pdt45.svg',
  };

  const boardSquares = useMemo(() => {
    // Basic FEN parsing (pieces part)
    const piecesPart = (position || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR').split(' ')[0];
    const rows = piecesPart.split('/');
    const result = [];

    // Rows from 8 to 1 (chess standard)
    for (let r = 0; r < 8; r++) {
      const currentRow = rows[r] || '8';
      let col = 0;
      
      for (let char of currentRow) {
        if (isNaN(parseInt(char))) {
          // It's a piece
          result.push({ piece: char, r, c: col });
          col++;
        } else {
          // It's empty squares
          const emptyCount = parseInt(char);
          for (let i = 0; i < emptyCount; i++) {
            result.push({ piece: null, r, c: col });
            col++;
          }
        }
      }
    }
    return result;
  }, [position]);

  return (
    <div 
      className="native-chessboard"
      style={{
        width: boardWidth,
        height: boardWidth,
        display: 'grid',
        gridTemplateColumns: 'repeat(8, 12.5%)',
        gridTemplateRows: 'repeat(8, 12.5%)',
        position: 'relative',
        borderRadius: '8px',
        overflow: 'hidden',
        boxShadow: '0 12px 48px rgba(0, 0, 0, 0.4)',
        userSelect: 'none',
        aspectRatio: '1 / 1'
      }}
    >
      {boardSquares.map((sq, idx) => {
        const isDark = (sq.r + sq.c) % 2 !== 0;
        return (
          <div 
            key={`${sq.r}-${sq.c}`}
            className="square"
            style={{
              backgroundColor: isDark ? '#6c5ce7' : '#d1c4e9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative'
            }}
          >
            {/* Rank/File coordinates for edge squares */}
            {sq.c === 0 && (
              <span style={{ 
                position: 'absolute', 
                top: 2, left: 2, 
                fontSize: '10px', 
                color: isDark ? '#d1c4e9' : '#6c5ce7',
                fontWeight: 600,
                opacity: 0.8
              }}>
                {8 - sq.r}
              </span>
            )}
            {sq.r === 7 && (
              <span style={{ 
                position: 'absolute', 
                bottom: 2, right: 2, 
                fontSize: '10px', 
                color: isDark ? '#d1c4e9' : '#6c5ce7',
                fontWeight: 600,
                opacity: 0.8
              }}>
                {String.fromCharCode(97 + sq.c)}
              </span>
            )}

            {/* Piece Image */}
            {sq.piece && (
              <img 
                src={PIECE_IMAGES[sq.piece]} 
                alt={sq.piece}
                style={{
                  width: '85%',
                  height: '85%',
                  zIndex: 2,
                  pointerEvents: 'none',
                  filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.25))',
                  transition: 'transform 0.2s ease-in-out', // Suaviza el cambio visual
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
