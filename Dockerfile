FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
COPY packages/shared/package*.json ./packages/shared/
COPY apps/web/package*.json ./apps/web/
RUN npm install
COPY . .
RUN cd apps/web && npx prisma generate && npm run build
EXPOSE 3000
CMD ["npm", "run", "start", "--workspace=apps/web"]
