import * as proxy from "udp-proxy";

const listen: number = parseInt(process.argv[2]);
const [targetHost, targetPortRaw] = process.argv[3].split(":");
const targetPort = parseInt(targetPortRaw);

const server = proxy.createServer({
	address: targetHost,
	port: targetPort,
	localport: listen
});

const outbound: number[][] = [];
const inbound: number[][] = [];

server.on("message", (message: Buffer, sender: any) => {
	const bufferArray = message.toJSON().data;
	outbound.push(bufferArray);
	console.log("outbound", bufferArray);
});

server.on('proxyMsg', function (message: Buffer, sender, peer) {
	const bufferArray = message.toJSON().data;
	inbound.push(bufferArray);
	console.log("inbound", bufferArray);
});
