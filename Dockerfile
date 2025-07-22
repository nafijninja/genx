# Use official Playwright image with browsers and deps preinstalled
FROM mcr.microsoft.com/playwright:v1.42.0-focal

# Set working directory inside container
WORKDIR /app

# Copy package.json and package-lock.json (or yarn.lock) first for caching
COPY package*.json ./

# Install npm dependencies
RUN npm install

# Copy your entire app (including index.js and public folder)
COPY . .

# Expose port your app will run on
EXPOSE 10000

# Start your Node.js app
CMD ["node", "index.js"]
