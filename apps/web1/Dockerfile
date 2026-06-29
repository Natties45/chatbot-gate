FROM node:22 AS base
WORKDIR /app
COPY package*.json ./
COPY apps/web1/package*.json ./apps/web1/
RUN npm install
COPY . .

FROM base AS prod
RUN cd apps/web1 && npm run build
EXPOSE 3000
CMD ["sh", "-c", "npm run start --workspace=apps/web1"]

FROM base AS dev
EXPOSE 4568
CMD ["sh", "-c", "npm run dev --workspace=apps/web1"]
