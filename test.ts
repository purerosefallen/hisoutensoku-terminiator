import { Attacker } from "./attacker";

const [targetHost, targetPortRaw] = process.argv[2].split(":");
const targetPort = parseInt(targetPortRaw);

console.log(targetHost, targetPort);
async function main() {
	const attacker = new Attacker(targetHost, targetPort, 1000);
	console.log((await attacker.attack()) || "success");
}
main();
