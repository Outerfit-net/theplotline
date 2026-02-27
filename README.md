# Plot Lines

An AI-powered garden dialog newsletter. Daily conversations between fictional gardeners, written in the style of literary masters, delivered to your inbox.

## Features

- **12 Unique Characters**: From the practical Buck Thorn to the worrying Harry Kvetch
- **12 Author Styles**: Hemingway, Carver, Munro, Morrison, and more
- **Weather-Aware**: Conversations respond to your local weather
- **Location-Based**: Gardening advice relevant to your region

## Quickstart

```bash
# Clone the repository
git clone <repo-url>
cd theplotline

# Install dependencies
make install

# Set up environment
cp .env.example .env
# Edit .env with your settings

# Initialize database
make db:setup

# Run development servers
make dev
```

## Project Structure

```
theplotline/
├── server/                 # Fastify backend
│   ├── garden/            # Python conversation engine
│   │   ├── engine.py      # Main generation script
│   │   └── authors.json   # Author style definitions
│   ├── db/                # Database
│   │   ├── schema.sql     # SQLite schema
│   │   ├── init.js        # DB initialization
│   │   └── seed.js        # Seed authors
│   ├── routes/            # API endpoints
│   │   ├── subscribers.js # Subscription management
│   │   └── authors.js     # Author listing
│   ├── services/          # Business logic
│   │   ├── geocode.js     # Nominatim geocoding
│   │   ├── nws.js         # NWS weather API
│   │   └── email.js       # SMTP email service
│   ├── cron/              # Scheduled jobs
│   │   ├── dispatch.js    # Daily generation
│   │   └── index.js       # Cron registration
│   └── index.js           # Server entry point
├── client/                # React frontend
│   ├── src/
│   │   ├── App.jsx        # Main app component
│   │   └── components/    # UI components
│   ├── index.html
│   └── package.json
├── docs/                  # Documentation
├── data/                  # SQLite database (gitignored)
├── .env.example           # Environment template
├── Makefile              # Build commands
└── README.md
```

## API Endpoints

- `POST /api/subscribe` - Create new subscription
- `GET /api/confirm/:token` - Confirm email subscription
- `POST /api/unsubscribe` - Unsubscribe by token
- `GET /api/authors` - List available author styles

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | 3001 |
| `DATABASE_PATH` | SQLite database path | ./data/plotlines.db |
| `SMTP_HOST` | SMTP server | smtp.gmail.com |
| `SMTP_PORT` | SMTP port | 587 |
| `SMTP_USER` | SMTP username | - |
| `SMTP_PASS` | SMTP password | - |
| `EMAIL_FROM` | From address | - |
| `BASE_URL` | API base URL | http://localhost:3001 |
| `CLIENT_URL` | Frontend URL | http://localhost:5173 |

## Characters

1. **Buck Thorn** - Practical, no-nonsense, decades of experience
2. **Harry Kvetch** - Perpetual worrier, sees problems everywhere
3. **Ms. Canthus** - Elegant, formal, quotes poetry
4. **Poppy Seed** - Dreamy, optimistic, tends to wander
5. **Ivy League** - Academic, loves Latin names
6. **Chelsea Flower** - Competition gardener, perfectionist
7. **Buster Native** - Native plant advocate
8. **Fern Young** - New gardener, eager learner
9. **Esther Potts** - Container gardening specialist
10. **Herb Berryman** - Culinary focus, grows for kitchen
11. **Muso Maple** - Tree specialist, long-term thinker
12. **Edie Bell** - Elderly, wise, traditional methods

## Author Styles

- Hemingway - Short, declarative, iceberg theory
- Carver - Minimalist, working-class
- Munro - Time-spanning, interior lives
- Morrison - Musical, community-focused
- And 8 more...

## License

MIT
