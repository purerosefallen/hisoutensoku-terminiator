FROM node:buster-slim
RUN npm -g install typescript ts-node

RUN apt update && \
	apt -y install build-essential python3 && \
	rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*

WORKDIR /usr/src/app
COPY package*.json ./
RUN npm ci
COPY . ./
CMD ["ts-node", "./run.ts"]
