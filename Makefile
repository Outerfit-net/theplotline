.PHONY: install dev build db:init db:seed clean

# Install all dependencies
install:
	cd server && npm install
	cd client && npm install

# Run development servers
dev:
	@echo "Starting development servers..."
	@echo "Server: http://localhost:3001"
	@echo "Client: http://localhost:5173"
	@(cd server && npm run dev) & (cd client && npm run dev)

# Build for production
build:
	cd client && npm run build

# Initialize database
db\:init:
	cd server && node db/init.js

# Seed database with authors
db\:seed:
	cd server && node db/seed.js

# Full database setup
db\:setup: db\:init db\:seed
	@echo "Database setup complete"

# Clean build artifacts
clean:
	rm -rf client/dist
	rm -rf server/node_modules
	rm -rf client/node_modules

# Run server only
server:
	cd server && npm run dev

# Run client only
client:
	cd client && npm run dev

# Run cron dispatch manually
dispatch:
	cd server && node cron/dispatch.js

# Test the garden engine
test-engine:
	cd server && python3 garden/engine.py \
		--station BOU \
		--author hemingway \
		--city Boulder \
		--state CO \
		--lat 40.015 \
		--lon -105.2705 \
		--output text
