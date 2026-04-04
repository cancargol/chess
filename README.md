# ♚ Ajedrez Maestro

Skill de Alexa para jugar al ajedrez contra Stockfish + Dashboard web con ranking y visor de partidas.

## 📁 Estructura del Proyecto

```
cancargolchess/
├── alexa-skill/
│   ├── lambda/           → Backend AWS Lambda (ASK SDK v2 + Stockfish.js)
│   └── interaction-model/ → Modelo de interacción para Alexa Console
└── dashboard/            → Web Dashboard (Next.js)
```

## 🎤 Alexa Skill

### Comandos de Voz

| Comando | Ejemplo |
|---------|---------|
| Identificarse | "Soy Juan", "Me llamo María" |
| Nuevo juego | "Nueva partida" |
| Ajustar nivel | "Ajusta el nivel a ELO 1500" |
| Mover (algebraica) | "Peón e4", "Caballo f3", "Alfil captura en e5" |
| Mover (coordenadas) | "De e2 a e4" |
| Enroque | "Enroque corto", "Enroque largo" |
| Coronar | "Peón e8 corona dama" |
| Estado | "Estado", "¿Cómo va la partida?" |
| Rendirse | "Me rindo", "Abandono" |
| Ayuda | "Ayuda" |

### Despliegue de la Lambda

1. **Instalar dependencias:**
   ```bash
   cd alexa-skill/lambda
   npm install
   ```

2. **Crear ZIP para Lambda:**
   ```bash
   npm run zip
   ```

3. **Subir a AWS Lambda:**
   - Runtime: Node.js 18.x
   - Handler: `index.handler`
   - Memoria: **512 MB** mínimo (1024 MB recomendado para Stockfish)
   - Timeout: **30 segundos**
   - Región: `eu-west-1`

4. **Variables de entorno Lambda:**
   ```
   USERS_TABLE=ajedrez_maestro_users
   GAMES_TABLE=ajedrez_maestro_games
   AWS_REGION=eu-west-1
   ```

5. **Crear tablas DynamoDB:**
   
   **Tabla `ajedrez_maestro_users`:**
   - Partition Key: `id` (String)
   - GSI `name-index`: Partition Key `name_lower` (String)
   
   **Tabla `ajedrez_maestro_games`:**
   - Partition Key: `id` (String)
   - GSI `player-index`: Partition Key `player_id` (String)

### Modelo de Interacción

1. Ve a la [Alexa Developer Console](https://developer.amazon.com/alexa/console/ask)
2. Crea una nueva Skill → Custom → Provision your own
3. En **Interaction Model** → **JSON Editor**, pega el contenido de `alexa-skill/interaction-model/es-ES.json`
4. Guarda y construye el modelo
5. En **Endpoint**, configura la ARN de tu Lambda

### Beta Testing (solo amigos)

1. En la consola de Alexa, ve a **Distribution** → **Availability** → **Beta Test**
2. Invita a tus amigos por email
3. Ellos recibirán un enlace para activar la Skill en su cuenta

## 🌐 Dashboard Web

### Desarrollo Local

```bash
cd dashboard
npm install
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000)

### Variables de Entorno

Crea un archivo `.env.local` en `dashboard/`:

```env
AWS_ACCESS_KEY_ID_DB=tu_access_key
AWS_SECRET_ACCESS_KEY_DB=tu_secret_key
AWS_REGION=eu-west-1
USERS_TABLE=ajedrez_maestro_users
GAMES_TABLE=ajedrez_maestro_games
```

> ⚠️ Usa un usuario IAM con **permisos de solo lectura** para DynamoDB.

### Despliegue en Vercel

1. Haz push del código a GitHub
2. Ve a [vercel.com](https://vercel.com) y conecta el repositorio
3. Configura el **Root Directory** como `dashboard`
4. Añade las variables de entorno en Vercel
5. Deploy 🚀

### Autenticación

El dashboard está protegido por un PIN de 4 dígitos que se genera automáticamente cuando un usuario se registra en Alexa. Alexa dicta el PIN al crear el perfil.

## 🏆 Sistema de Ranking

```
Puntos = Σ(Resultado × ELO_Motor)
```

- **Victoria** (1.0 × ELO): Ganar a ELO 1700 = +1700 puntos
- **Tablas** (0.5 × ELO): Tablas contra ELO 1700 = +850 puntos
- **Derrota** (0.0 × ELO): +0 puntos

Esto incentiva a los jugadores a enfrentarse a niveles más altos.

## 🔧 Mapeo ELO → Stockfish

| ELO | Skill Level | Depth | Nivel |
|-----|-------------|-------|-------|
| 100-400 | 0 | 1 | Principiante absoluto |
| 401-600 | 2 | 2 | Principiante |
| 601-800 | 4 | 3 | Casual bajo |
| 801-1000 | 6 | 5 | Casual |
| 1001-1200 | 8 | 7 | Aficionado bajo |
| 1201-1400 | 10 | 9 | Aficionado |
| 1401-1600 | 12 | 11 | Intermedio |
| 1601-1800 | 14 | 13 | Avanzado bajo |
| 1801-2000 | 16 | 15 | Avanzado |
| 2001-2200 | 18 | 17 | Experto |
| 2201-2500 | 19 | 19 | Maestro |
| 2501-3000 | 20 | 22 | Gran Maestro |

## 📋 Tech Stack

- **Lambda**: Node.js 18.x, ASK SDK v2, chess.js, stockfish.js (WASM)
- **Base de datos**: DynamoDB (AWS Free Tier)
- **Dashboard**: Next.js 14+, react-chessboard, Vercel
- **Coste**: 0€ (todo en Free Tier)
