FROM public.ecr.aws/docker/library/node:18.0

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY tsconfig.json ./
COPY src ./src

RUN npm run build

EXPOSE 80

CMD ["npm", "start"]
