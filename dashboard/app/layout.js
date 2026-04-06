import './globals.css';

export const metadata = {
  title: 'Ajedrez Caracol | Dashboard',
  description: 'Dashboard de ranking y partidas de Ajedrez Caracol. Juega contra Stockfish por voz con Alexa y sigue tu progreso.',
  icons: {
    icon: 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>♚</text></svg>',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body suppressHydrationWarning={true}>
        {children}
      </body>
    </html>
  );
}
