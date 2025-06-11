FROM node:20-slim

# On installe curl qui est nécessaire pour notre script d'attente
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

RUN npm install -g pnpm

WORKDIR /app

COPY package.json pnpm-lock.yaml tsconfig.json ./
RUN pnpm install

COPY . .

RUN pnpm run codegen

# On copie les deux scripts
COPY start.sh .
COPY wait-for-hasura.sh .
RUN chmod +x ./start.sh ./wait-for-hasura.sh

RUN ln -s . root

EXPOSE 8081

# MODIFICATION DE LA COMMANDE FINALE
# On lance le script d'attente, en lui passant l'URL de Hasura et la commande à exécuter ensuite.
CMD [ "./wait-for-hasura.sh", "http://graphql-engine:8080", "./start.sh" ]
