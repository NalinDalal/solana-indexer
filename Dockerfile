# Use Bun official image
FROM oven/bun:latest

# Set workdir
WORKDIR /app

# Copy package files and install dependencies
COPY package.json bun.lockb tsconfig.json ./
RUN bun install

# Copy the rest of the app
COPY . .

# Expose port your app uses (example: 3000)
EXPOSE 3000

# Run the app
CMD ["bun", "run", "index.ts"]

