# Winter Games Predictor

Een voorspellings-app voor de Olympische Winterspelen waar je met vrienden in poules kunt spelen en punten kunt verdienen door schaats-, bobslee- en snowboardwedstrijden te voorspellen.

## Features

- **Poule systeem**: Maak poules aan en nodig vrienden uit via invite-links
- **Voorspellingen**: Voorspel de top 3 van elke wedstrijd + wereldrecords
- **Meerdere sporten**: Schaatsen, Bobsleeën, Snowboarden
- **Puntensysteem**: Verdien punten voor correcte voorspellingen
- **Ranglijsten**: Per poule en globaal
- **Trofeeën**: Verdien achievements en bouw je bekerkast op
- **Prikbord**: Deel memes en chat met je poule-genoten
- **Geld inzet**: Optioneel geld inzetten per poule

## Tech Stack

- **Frontend**: React 18 + Vite + Tailwind CSS
- **Backend**: Node.js + Express
- **Database**: SQLite (better-sqlite3)
- **Authenticatie**: JWT tokens

## Installatie

### Vereisten

- Node.js 18 of hoger
- npm of yarn

### Backend

```bash
cd winter-games-predictor/backend

# Installeer dependencies
npm install

# Initialiseer de database
npm run init-db

# Start de server
npm run dev
```

De backend draait op `http://localhost:3001`

### Frontend

```bash
cd winter-games-predictor/frontend

# Installeer dependencies
npm install

# Start de development server
npm run dev
```

De frontend draait op `http://localhost:3000`

## Gebruik

1. Open `http://localhost:3000` in je browser
2. Registreer een account
3. Maak een nieuwe poule aan of join met een invite code
4. Selecteer de sporten die je wilt voorspellen
5. Maak je voorspellingen voor aankomende wedstrijden
6. Bekijk de ranglijsten en verdien trofeeën!

## Puntensysteem

| Actie | Punten |
|-------|--------|
| Correcte 1e plaats | 10 |
| Correcte 2e plaats | 6 |
| Correcte 3e plaats | 4 |
| Complete top 3 bonus | 5 |
| Juiste atleet, verkeerde positie | 2 |
| Wereldrecord correct voorspeld | 3 |

## API Endpoints

### Auth
- `POST /api/auth/register` - Registreer
- `POST /api/auth/login` - Inloggen
- `GET /api/auth/verify` - Token verificatie

### Users
- `GET /api/users/me` - Eigen profiel
- `PUT /api/users/me` - Update profiel
- `POST /api/users/me/avatar` - Upload profielfoto

### Pools
- `GET /api/pools/my-pools` - Eigen poules
- `POST /api/pools` - Maak poule
- `POST /api/pools/join/:inviteCode` - Join poule
- `GET /api/pools/:id` - Poule details

### Events
- `GET /api/events/pool/:poolId` - Wedstrijden voor poule
- `GET /api/events/:id` - Wedstrijd details

### Predictions
- `POST /api/predictions` - Maak voorspelling
- `GET /api/predictions/pool/:poolId` - Eigen voorspellingen

### Leaderboards
- `GET /api/leaderboards/pool/:poolId` - Poule ranglijst
- `GET /api/leaderboards/global` - Globale ranglijst

### Posts (Prikbord)
- `GET /api/posts/pool/:poolId` - Berichten
- `POST /api/posts/pool/:poolId` - Nieuw bericht
- `POST /api/posts/:postId/comments` - Reageer

### Trophies
- `GET /api/trophies` - Alle trofeeën
- `GET /api/trophies/user/:userId` - Gebruiker trofeeën

## Projectstructuur

```
winter-games-predictor/
├── backend/
│   ├── config/
│   │   └── database.js
│   ├── middleware/
│   │   └── auth.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── users.js
│   │   ├── pools.js
│   │   ├── events.js
│   │   ├── predictions.js
│   │   ├── leaderboards.js
│   │   ├── posts.js
│   │   └── trophies.js
│   ├── utils/
│   │   └── initDb.js
│   ├── server.js
│   └── package.json
│
└── frontend/
    ├── public/
    │   └── snowflake.svg
    ├── src/
    │   ├── components/
    │   │   ├── Layout.jsx
    │   │   └── LoadingScreen.jsx
    │   ├── contexts/
    │   │   └── AuthContext.jsx
    │   ├── pages/
    │   │   ├── Login.jsx
    │   │   ├── Register.jsx
    │   │   ├── Dashboard.jsx
    │   │   ├── Pools.jsx
    │   │   ├── PoolDetail.jsx
    │   │   ├── CreatePool.jsx
    │   │   ├── JoinPool.jsx
    │   │   ├── Events.jsx
    │   │   ├── EventDetail.jsx
    │   │   ├── Leaderboard.jsx
    │   │   ├── Profile.jsx
    │   │   ├── UserProfile.jsx
    │   │   ├── Trophies.jsx
    │   │   └── BulletinBoard.jsx
    │   ├── utils/
    │   │   └── api.js
    │   ├── App.jsx
    │   ├── main.jsx
    │   └── index.css
    ├── index.html
    ├── vite.config.js
    ├── tailwind.config.js
    └── package.json
```

## Demo Data

Bij het initialiseren van de database worden automatisch toegevoegd:
- 3 wintersporten (Schaatsen, Bobsleeën, Snowboarden)
- 10 trofeeën
- 18 atleten
- 15 wedstrijden voor de Winterspelen 2026
- 1 toernooi (Olympische Winterspelen 2026 - Milano-Cortina)

## Toekomstige verbeteringen

- [ ] Live score API integratie
- [ ] Push notificaties voor deadlines
- [ ] Betalingen integratie (Tikkie/iDEAL)
- [ ] Meer sporten toevoegen
- [ ] Admin panel voor wedstrijd beheer
- [ ] Social login (Google)
