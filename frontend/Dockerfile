FROM node:24-slim

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY index.html ./
COPY tsconfig*.json ./
COPY vite.config.ts ./
COPY src ./src

EXPOSE 5173

CMD ["npm", "run", "dev"]
