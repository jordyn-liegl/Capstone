# ================================
# Stage 1: Base Dependencies (Caching Optimized)
# ================================
FROM node:18-alpine AS base

# Set working directory
WORKDIR /src/app

# Copy package.json and package-lock.json first (better caching)
COPY package*.json ./

# Install dependencies
RUN npm install

# ================================
# Stage 2: Development (With Live Reloading)
# ================================
FROM node:18-alpine AS dev

WORKDIR /src/app

# Copy dependencies from base stage
COPY --from=base /src/app/node_modules ./node_modules

# Copy all files
COPY . .

# Expose port 3000
EXPOSE 3000

# Enable file watching for hot reloading
ENV CHOKIDAR_USEPOLLING=true

# Run Next.js in development mode
CMD ["npm", "run", "dev"]

# ================================
# Stage 3: Production (Optimized)
# ================================
FROM node:18-alpine AS prod

WORKDIR /src/app

# Copy dependencies from base stage
COPY --from=base /src/app/node_modules ./node_modules

# Copy only necessary files from the build stage
COPY --from=dev /src/app/package.json ./package.json
COPY --from=dev /src/app/.next ./.next
COPY --from=dev /src/app/public ./public

# Install only production dependencies
RUN npm install --production

# Expose port 3000
EXPOSE 3000

# Start Next.js in production mode
CMD ["npm", "start"]
