# Use official Playwright image with Chromium already installed
FROM mcr.microsoft.com/playwright:v1.53.1-focal

# Set working directory
WORKDIR /app

# Copy package files and install deps
COPY package.json package-lock.json ./
RUN npm install

# Copy your source code
COPY . .

# Run your server
CMD ["node", "index.js"]
