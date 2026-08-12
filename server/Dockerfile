# JIVA backend — Express + Socket.IO
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev

COPY . .

EXPOSE 4000

# Reads MONGO_URI, JWT secrets etc. from the environment.
CMD ["npm", "start"]
