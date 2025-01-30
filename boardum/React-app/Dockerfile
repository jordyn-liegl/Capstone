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

# Build the Next.js app for production
RUN npm run build

# Use the official Node.js image as the base for the final image
FROM node:18-alpine

# Set working directory inside the container
WORKDIR /src/app

# Copy only the necessary files from the build stage
COPY --from=build /src/app/package*.json ./
COPY --from=build /src/app/.next ./.next
COPY --from=build /src/app/public ./public

# Install only production dependencies
RUN npm install --production

# Expose port 3000 (since your app runs on this port)
EXPOSE 3000

# Start the Next.js app in production mode
CMD ["npm", "start"]
