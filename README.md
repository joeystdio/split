# Split 🍽️

A simple bill splitter for group dinners. Create bills, add items and participants, assign who ate what, and calculate each person's share including tax and tip.

## Features

- 🔐 SSO authentication via auth.jdms.nl
- 📝 Create bills with items and prices
- 👥 Add participants
- ✅ Assign items to participants (split shared items automatically)
- 💰 Calculate individual shares with proportional tax/tip
- 🔗 Generate public shareable links (no auth required)
- 🇹🇭 Thai Baht as default currency (supports USD, EUR, GBP, JPY)

## Tech Stack

- Node.js + Express
- PostgreSQL
- EJS templates
- Docker + Traefik

## Development

```bash
# Install dependencies
npm install

# Set up environment
cp .env.example .env
# Edit .env with your database credentials

# Run migrations
npm run migrate

# Start development server
npm run dev
```

## Deployment

```bash
# Build and start containers
docker compose up -d --build

# View logs
docker compose logs -f app
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| DB_PASSWORD | PostgreSQL password | - |
| NODE_ENV | Environment | production |
| PORT | App port | 3000 |

## License

MIT
