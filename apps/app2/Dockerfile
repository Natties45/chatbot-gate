FROM node:22 AS base
WORKDIR /app
RUN apt-get update && apt-get install -y git openssh-client && rm -rf /var/lib/apt/lists/*
COPY package*.json ./
COPY apps/app2/package*.json ./apps/app2/
RUN npm install
COPY . .

FROM base AS prod
RUN npm run prisma:generate --workspace=apps/app2 && npm run build --workspace=apps/app2
EXPOSE 3001
ENV PORT=3001
CMD ["sh", "-c", "npm run prisma:migrate --workspace=apps/app2 && npm run db:seed --workspace=apps/app2 && npm run start --workspace=apps/app2"]

FROM base AS dev
EXPOSE 4570
CMD ["sh", "-c", "npx prisma generate --schema=apps/app2/prisma/schema.prisma && npm run dev --workspace=apps/app2"]
