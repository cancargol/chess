'use client';

import Link from 'next/link';

export default function RankingTable({ players }) {
  if (!players || players.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">♟️</div>
        <p>No hay jugadores registrados aún.</p>
        <p style={{ fontSize: '0.85rem', marginTop: '0.5rem' }}>
          Abre la Skill de Alexa y di &quot;Alexa, abre Ajedrez Caracol&quot; para empezar.
        </p>
      </div>
    );
  }

  // Ordenar por total_points descendente
  const sorted = [...players].sort((a, b) => (b.total_points || 0) - (a.total_points || 0));

  return (
    <div className="ranking-table-wrapper">
      <table className="ranking-table">
        <thead>
          <tr>
            <th style={{ width: '60px' }}>#</th>
            <th>Jugador</th>
            <th>Puntos</th>
            <th>ELO</th>
            <th>Victorias</th>
            <th>Derrotas</th>
            <th>Tablas</th>
            <th>Win Rate</th>
          </tr>
        </thead>
        <tbody className="stagger">
          {sorted.map((player, index) => {
            const rank = index + 1;
            const totalGames = (player.wins || 0) + (player.losses || 0) + (player.draws || 0);
            const winRate = totalGames > 0
              ? Math.round(((player.wins || 0) / totalGames) * 100)
              : 0;

            let rankClass = 'rank-default';
            if (rank === 1) rankClass = 'rank-1';
            else if (rank === 2) rankClass = 'rank-2';
            else if (rank === 3) rankClass = 'rank-3';

            return (
              <tr key={player.id} className="animate-in" style={{ opacity: 0 }}>
                <td>
                  <span className={`rank-badge ${rankClass}`}>{rank}</span>
                </td>
                <td>
                  <Link href={`/player?id=${player.id}`} style={{ textDecoration: 'none' }}>
                    <div className="player-name-cell">
                      <div className="player-avatar">
                        {(player.name || '?')[0].toUpperCase()}
                      </div>
                      <span className="player-name">{player.name}</span>
                    </div>
                  </Link>
                </td>
                <td>
                  <span className="stat-value points">{(player.total_points || 0).toLocaleString()}</span>
                </td>
                <td>
                  <span className="stat-value elo">{player.current_elo || 1200}</span>
                </td>
                <td>
                  <span className="stat-value wins">{player.wins || 0}</span>
                </td>
                <td>
                  <span className="stat-value losses">{player.losses || 0}</span>
                </td>
                <td>
                  <span className="stat-value draws">{player.draws || 0}</span>
                </td>
                <td>
                  <span className="stat-value" style={{ color: winRate >= 50 ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                    {winRate}%
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
