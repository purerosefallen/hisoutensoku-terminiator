import { attack } from "./attacker";

const [targetHost, targetPortRaw] = process.argv[2].split(":");
const targetPort = parseInt(targetPortRaw);

console.log(targetHost, targetPort);
async function main() {
	console.log((await attack(targetHost, targetPort, 1000)) || "success");
}
main();
