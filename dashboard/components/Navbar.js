'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { logout } from '@/lib/api';

export default function Navbar() {
  const pathname = usePathname();

  const links = [
    { href: '/', label: 'Ranking', icon: '🏆' },
    { href: '/games', label: 'Partidas', icon: '♟️' },
  ];

  function handleLogout() {
    logout();
    window.location.href = '/chess/';
  }

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <Link href="/" className="navbar-brand">
          <span className="brand-icon">♚</span>
          <span>Ajedrez Maestro</span>
        </Link>

        <div className="navbar-links">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`navbar-link ${pathname === link.href || pathname === `/chess${link.href}` ? 'active' : ''}`}
            >
              {link.icon} {link.label}
            </Link>
          ))}
          <button
            onClick={handleLogout}
            className="navbar-link"
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
          >
            🚪 Salir
          </button>
        </div>
      </div>
    </nav>
  );
}
