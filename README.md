# hisoutensoku-terminiator

A script preventing others playing Hisoutensoku in a QQ group, detecting group message and join fake clients in.

## Disclaimer

This project is only for educational purpose. I'm not responsed to what you did with this project. You may be tossed out if you abuse this.

## Note

This project may possibly be working only with Hisoutensoku ver 1.10a. Versions above or below may not work properly.

## How to use

* Ensure you have installed Docker and `docker-compose`.

* Join a QQ account into the target QQ groups.

* Create a `config.yaml` with the following below.

```yaml
coolq: # CoolQ config. The docker-compose config below meets this configuration.
  type: ws
  server: coolq
  selfId: 1111111111 # Your QQ account here
  token: qweqwe
  secret: asdasd
attackTimeout: 10000 # The timeout the fake clients would wait for connection.
floodQQGroups: # Target QQ groups
  - 111111111
addressWhitelist: # You may add your own servers here to prevent being affected.
  - 1.1.1.1
```

* Create a `docker-compose.yml` with the following below.

```yaml
version: '2.4'
services:
  coolq:
    restart: always
    image: nanahira/go-cqhttp
    volumes:
      - ./coolq:/data
    environment:
      UIN: 1111111111 # Your QQ account here
      PASS: aaaaaaaaa # Your QQ password here
      ACCESS_TOKEN: qweqwe
      SECRET: asdasd
      USE_DB: true
  terminator:
    restart: always
    image: nanahira/hisoutensoku-terminator
    volumes:
      - ./config.yaml:/usr/src/app/config.yaml:ro
```

* `docker-compose up -d`

* Visit `http://YOUR_SERVER_IP:9000` and log in your QQ account in the web VNC.

* ~~Be ready to be tossed out from the group by group moderators.~~
