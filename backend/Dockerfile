FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .
ENV PORT=5001
EXPOSE 5001
CMD ["node", "server.js"]
