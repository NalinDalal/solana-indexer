# Use Bun official image
FROM oven/bun:latest

WORKDIR /app

# Copy package files first (for caching deps)
COPY bun.lockb package.json ./

# Install dependencies
RUN bun install

# Copy rest of the app
COPY . .

# Expose your app port (if any, e.g., 3000)
EXPOSE 3000

# Default command
CMD ["bun", "run", "dev"]

