FROM node:22-alpine AS build
WORKDIR /usr/src/app

RUN apk add --no-cache openssl

COPY package.json package-lock.json ./
COPY prisma ./prisma/

RUN npm ci --ignore-scripts
RUN npx prisma generate

COPY . .

RUN npm run build

RUN npm prune --omit=dev

FROM node:22-alpine AS runner
WORKDIR /usr/src/app

RUN apk add --no-cache openssl

COPY --from=build /usr/src/app/node_modules ./node_modules
COPY --from=build /usr/src/app/dist ./dist
USER node

EXPOSE 8001

CMD [ "node", "dist/src/main.js" ]
