FROM node:22-alpine

WORKDIR /usr/src/app

# Install dependencies
COPY package*.json ./
RUN npm install --ignore-scripts

# Copy source code
COPY . .

# Generate Prisma Client
RUN npx prisma generate --schema src/prisma/schema.prisma

EXPOSE 3000

CMD ["npm", "start"]
