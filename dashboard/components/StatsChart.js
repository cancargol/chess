'use client';

export default function StatsChart({ games }) {
  if (!games || games.length === 0) return null;

  // Agrupar por rango de ELO del motor
  const eloRanges = [
    { label: '100-600', min: 100, max: 600 },
    { label: '601-1200', min: 601, max: 1200 },
    { label: '1201-1800', min: 1201, max: 1800 },
    { label: '1801-2400', min: 1801, max: 2400 },
    { label: '2401-3000', min: 2401, max: 3000 },
  ];

  const stats = eloRanges.map((range) => {
    const rangeGames = games.filter(
      (g) => g.engine_elo >= range.min && g.engine_elo <= range.max && g.result !== 'in_progress'
    );
    const wins = rangeGames.filter((g) => g.result === 'win').length;
    const losses = rangeGames.filter((g) => g.result === 'loss').length;
    const draws = rangeGames.filter((g) => g.result === 'draw').length;
    const total = wins + losses + draws;

    return {
      ...range,
      wins,
      losses,
      draws,
      total,
      winRate: total > 0 ? Math.round((wins / total) * 100) : 0,
    };
  }).filter((s) => s.total > 0);

  if (stats.length === 0) return null;

  const maxGames = Math.max(...stats.map((s) => s.total));

  return (
    <div style={{ marginTop: '2rem' }}>
      <h3 style={{
        fontSize: '0.8rem',
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        color: 'var(--text-muted)',
        marginBottom: '1rem',
      }}>
        Rendimiento por nivel de dificultad
      </h3>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {stats.map((stat) => (
          <div key={stat.label} className="card" style={{ padding: '1rem 1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                ELO {stat.label}
              </span>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                {stat.total} partidas
              </span>
            </div>

            {/* Bar chart */}
            <div style={{
              display: 'flex',
              height: '24px',
              borderRadius: '6px',
              overflow: 'hidden',
              background: 'var(--bg-tertiary)',
            }}>
              {stat.wins > 0 && (
                <div
                  style={{
                    width: `${(stat.wins / stat.total) * 100}%`,
                    background: 'var(--accent-green)',
                    transition: 'width 0.5s ease',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.65rem',
                    fontWeight: 600,
                    color: '#fff',
                    minWidth: stat.wins > 0 ? '20px' : 0,
                  }}
                  title={`${stat.wins} victorias`}
                >
                  {stat.wins}
                </div>
              )}
              {stat.draws > 0 && (
                <div
                  style={{
                    width: `${(stat.draws / stat.total) * 100}%`,
                    background: 'var(--accent-blue)',
                    transition: 'width 0.5s ease',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.65rem',
                    fontWeight: 600,
                    color: '#fff',
                    minWidth: stat.draws > 0 ? '20px' : 0,
                  }}
                  title={`${stat.draws} tablas`}
                >
                  {stat.draws}
                </div>
              )}
              {stat.losses > 0 && (
                <div
                  style={{
                    width: `${(stat.losses / stat.total) * 100}%`,
                    background: 'var(--accent-red)',
                    transition: 'width 0.5s ease',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.65rem',
                    fontWeight: 600,
                    color: '#fff',
                    minWidth: stat.losses > 0 ? '20px' : 0,
                  }}
                  title={`${stat.losses} derrotas`}
                >
                  {stat.losses}
                </div>
              )}
            </div>

            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginTop: '0.35rem',
              fontSize: '0.75rem',
              color: 'var(--text-muted)',
            }}>
              <span>Win rate: <strong style={{ color: stat.winRate >= 50 ? 'var(--accent-green)' : 'var(--accent-red)' }}>{stat.winRate}%</strong></span>
              <span style={{ display: 'flex', gap: '0.75rem' }}>
                <span>🟢 {stat.wins}</span>
                <span>🔵 {stat.draws}</span>
                <span>🔴 {stat.losses}</span>
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
