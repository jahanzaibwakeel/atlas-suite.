FROM node:24-slim

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY tsconfig.json ./
COPY next.config.mjs ./
COPY next-env.d.ts ./
COPY src ./src

EXPOSE 5173

CMD ["npm", "run", "dev"]
