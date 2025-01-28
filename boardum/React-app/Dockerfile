# Use the official Node.js image as the base for building the app
FROM node:18-alpine AS build

# Set working directory inside the container
WORKDIR /src/app

# Copy package.json and package-lock.json (or npm-shrinkwrap.json if available)
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the source code to the container
COPY . .

# Build the Next.js app (SSR or dynamic rendering enabled)
#changed from npm run build
RUN npm run dev 

# Use the official Node.js image to serve the Next.js app
FROM node:18-alpine

WORKDIR /src/app

# Copy the app and dependencies from the build stage
COPY --from=build /src/app /src/app

# Expose port 3000 (since your app runs on this port)
EXPOSE 3000

# Start the Next.js app in production mode
CMD ["npm", "start"]
