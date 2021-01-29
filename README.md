<p align="center">
  <image src="https://github.com/Tandashi/YTSync-Plugin/blob/master/doc/title.png?raw=true">
  <br /> 
  <img src="https://github.com/Tandashi/YTSync-Plugin/workflows/YT%20Sync/badge.svg?branch=master">
  <img src="https://img.shields.io/github/v/release/Tandashi/YTSync-Plugin">
</p>
<p align="center">
  <a href="https://chrome.google.com/webstore/detail/ytsync/djjmipmoebdhkblgmllkehfghaekbimi">
    <img src="https://github.com/Tandashi/YTSync-Plugin/blob/master/doc/chrome.png?raw=true">
  </a>
  <a href="https://addons.mozilla.org/en-GB/firefox/addon/ytsync/">
     <img src="https://github.com/Tandashi/YTSync-Plugin/blob/master/doc/mozilla.png?raw=true">
  </a>
</p>

The server component for the [YTSync Plugin](https://github.com/Tandashi/YTSync-Plugin). 

## Whats is it for?

The server manages the syncing process of the different rooms and the clients for the [YTSync Plugin](https://github.com/Tandashi/YTSync-Plugin). It also supplies some resources like images for the clients.

## Installation

### Build from source

Required Dependencies:

- [yarn](https://yarnpkg.com) or [npm](https://www.npmjs.com)
- [node.js](https://nodejs.org/en/) (testet with v14+ but will probably work with v12 or less as well)

After you installed all the needed decpendencies you can get the source code by cloning the git repository:

```bash
# SSH
git clone git@github.com:Tandashi/YTSync-Server.git

# HTTPS
git clone https://github.com/Tandashi/YTSync-Server.git
```

To install the server dependencies run the following command:

```bash
# Using npm
npm install

# Using yarn
yarn install
```

The last step left is to start the server. This can be done as follows:

```bash
# Using npm
npm start

# Using yarn
yarn start
```

The above commands would start the server with the default configuration. This behaviour can be changed by creating a `.env` file in the root directory of the project. The following `.env` file would start the server on port 9000.

```bash
YTSYNC_SERVER_PORT=9000
```

Here is a list of all available enviroment variables:

|      Variable      |             Description              | Value | Default |
| :----------------: | :----------------------------------: | :---: | :-----: |
| YTSYNC_SERVER_PORT | The port the server should listen to |  int  |  8080   |

### Docker

To run the server using docker you can have to build the Docker Image yourself as of right now. This might change in the future though. To do this you first need to clone this repository using git:

```bash
# SSH
git clone git@github.com:Tandashi/YTSync-Server.git

# HTTPS
git clone https://github.com/Tandashi/YTSync-Server.git
```

After that you can build the Docker Image as follows:

```bash
docker build . -t tandashi/ytsync-server
```

Finally you can run the Docker Image:

```bash
docker run tandashi/ytsync-server
```

The Docker Image exposes the server on port 8080. But you probably want to use port mapping to make the server accessible for the outside world / host system. You can do this as follows:

```
docker run -p9000:8080 tandashi/ytsync-server
```

This would make the server accessible on port 9000 on your host system. You can change another port of course just replace the 9000 with the port of your choice. You can also use [docker-compose](https://docs.docker.com/compose/) which is also recommended.

## Hosting

If you want to host this server on your own for what ever reason (because there is no real point todo so) you might need to consider a few things:

1. The plugins are configured to connect to the default/main server. If you want to host your own server for e.g. for your friends you would need to change the server connection in the plugin and compile the plugin yourself. After that you can distribute the modified version to your friends. If you or your friends want to watch with someone else that doesn't have your modified version this will not work. They either need your modified version or you need to reinstall the official plugin.
2. The server and plugin use [socket.io](https://socket.io) to communicate with each other. You might need to configure your reverse-proxy, etc. to support this. They use the default path (`/socket.io`) for communication.

## Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

## License
[GNU General Public License v3.0](https://choosealicense.com/licenses/gpl-3.0/)
