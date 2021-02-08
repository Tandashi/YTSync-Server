FROM node:current-alpine

RUN mkdir -p /home/node/server/node_modules && chown -R node:node /home/node/server

WORKDIR /home/node/server

COPY --chown=node:node . .

USER node

RUN npm install

EXPOSE 8080

CMD [ "npm", "start" ]