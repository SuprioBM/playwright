# Use the official Playwright image with browsers pre-installed
FROM mcr.microsoft.com/playwright:focal

WORKDIR /app

# Copy dependency files and install
COPY package.json package-lock.json ./
RUN npm install

# Copy the rest of your scraper code
COPY . .

# Run your server
CMD ["node", "index.js"]
