FROM node:22 AS base
WORKDIR /app
RUN apt-get update && apt-get install -y git openssh-client && rm -rf /var/lib/apt/lists/*
COPY package*.json ./
COPY apps/web1/package*.json ./apps/web1/
RUN npm install
COPY . .

FROM base AS prod
RUN cd apps/web1 && npx prisma generate && npm run build
EXPOSE 3000
CMD ["sh", "-c", "npm run prisma:migrate --workspace=apps/web1 && npm run db:seed --workspace=apps/web1 && npm run start --workspace=apps/web1"]

FROM base AS dev
EXPOSE 4568
CMD ["sh", "-c", "npx prisma generate --schema=apps/web1/prisma/schema.prisma && npm run dev --workspace=apps/web1"]
