FROM node:20-alpine
WORKDIR /app

COPY package.json ./
RUN npm install

COPY src ./src

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://localhost:3000/healthz || exit 1
USER node
CMD ["npm", "start"]