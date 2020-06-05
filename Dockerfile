FROM debian:buster-slim as builder
RUN apt update && \
	apt -y install build-essential && \
	rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*

COPY ./udpflood /usr/src/app
WORKDIR /usr/src/app
RUN make -j$(nproc)

FROM node:buster-slim
RUN npm -g install typescript ts-node

RUN apt update && \
	apt -y install build-essential && \
	rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*

COPY --from=builder /usr/src/app/bin/Release/udpflood /usr/local/bin/
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm ci
COPY . ./
CMD ["ts-node", "./run.ts"]
