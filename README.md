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
  host: coolq
  accessToken: aaaaa
  qq: 1111111111 # Your QQ account here
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
    image: richardchien/cqhttp
    ports:
      - 9000:9000
    volumes:
      - ./coolq:/home/usr/coolq
    environment:
      VNC_PASSWD: YOUR_VNC_PASSWORD_HERE # Please change this
      COOLQ_ACCOUNT: 1111111111 # Your QQ account here
      FORCE_ENV: 'true'
      CQHTTP_USE_WS: 'true'
      CQHTTP_SERVE_DATA_FILES: 'true'
      CQHTTP_ACCESS_TOKEN: aaaaa # The above access token and secrets. Since the containers are not exposed to the public, you may not use strong ones.
  terminator:
    restart: always
    image: nanahira/hisoutensoku-terminator
    volumes:
      - ./config.yaml:/usr/src/app/config.yaml:ro
```

* `docker-compose up -d`

* Visit `http://YOUR_SERVER_IP:9000` and log in your QQ account in the web VNC.

* ~~Be ready to be tossed out from the group by group moderators.~~
