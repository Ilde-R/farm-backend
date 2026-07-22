FROM node:22-alpine AS development
WORKDIR /usr/src/app

RUN apk add --no-cache openssl

COPY package*.json ./
COPY prisma ./prisma/

RUN npm install --ignore-scripts
RUN npx prisma generate

COPY . .

FROM development AS build
RUN npm run build

RUN npm prune --omit=dev

FROM node:22-alpine AS runner
WORKDIR /usr/src/app

RUN apk add --no-cache openssl

COPY --from=build /usr/src/app/node_modules ./node_modules
COPY --from=build /usr/src/app/dist ./dist
COPY --from=build /usr/src/app/package*.json ./
COPY --from=build /usr/src/app/prisma ./prisma
COPY --from=build /usr/src/app/prisma.config.ts ./

USER node

EXPOSE 3000

CMD [ "node", "dist/src/main.js" ]
