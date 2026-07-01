FROM e2bdev/code-interpreter:latest

# Set working directory
WORKDIR /home/user

# Install Node.js 22 (required by create-vite 9+)
RUN curl -fsSL https://deb.nodesource.com/setup_22.x | bash - && \
    apt-get install -y nodejs && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Install Vite (React template)
RUN npm create vite@5.5.0 . -- --template react && \
    npm install

RUN echo "import { defineConfig } from 'vite'\nimport react from '@vitejs/plugin-react'\n\nexport default defineConfig({\n  plugins: [react()],\n  server: {\n    host: true, allowedHosts: true}\n})" > vite.config.js
