# Use Bun official image
FROM oven/bun:latest

WORKDIR /app

# Install OpenSSL so Prisma can detect libssl properly
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# Fake npm -> bun (Prisma sometimes calls npm)
RUN echo '#!/bin/sh\nexec bun "$@"' > /usr/local/bin/npm && chmod +x /usr/local/bin/npm

# Copy package files first (for caching deps)
COPY bun.lock package.json ./

# Install dependencies
RUN bun install

# Add prisma cli + client explicitly (just to be safe)
RUN bun add prisma --dev && bun add @prisma/client

# Copy rest of the app
COPY . .

# Generate Prisma client
RUN bunx prisma generate || true

# Expose your app port (e.g., 3000)
EXPOSE 3000

# Default command
CMD ["bun", "run", "index.ts"]

