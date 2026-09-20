import { spawn } from "node:child_process";
import { networkInterfaces } from "node:os";
import { createServer } from "node:net";
import { resolve } from "node:path";

const DEFAULT_PORT = 3000;

function isPrivateIpv4(address) {
  return /^10\./.test(address) || /^192\.168\./.test(address) || /^172\.(1[6-9]|2\d|3[01])\./.test(address);
}

function getLanAddresses() {
  return Object.entries(networkInterfaces()).flatMap(([interfaceName, entries]) =>
    (entries ?? [])
      .filter((entry) => (entry.family === "IPv4" || entry.family === 4) && !entry.internal && !entry.address.startsWith("169.254."))
      .map((entry) => ({ interfaceName, address: entry.address }))
  );
}

function chooseLanAddress() {
  const addresses = getLanAddresses();
  const isWireless = (interfaceName) => /wlan|wi-?fi|wireless|无线/i.test(interfaceName);
  return (
    addresses.find(({ interfaceName, address }) => isWireless(interfaceName) && isPrivateIpv4(address)) ??
    addresses.find(({ address }) => isPrivateIpv4(address)) ??
    addresses.find(({ interfaceName }) => isWireless(interfaceName)) ??
    addresses[0]
  );
}

function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = createServer();
    server.once("error", () => resolve(false));
    server.listen(port, "0.0.0.0", () => server.close(() => resolve(true)));
  });
}

async function findPort() {
  const configuredPort = Number(process.env.PORT ?? DEFAULT_PORT);
  const startPort = Number.isInteger(configuredPort) && configuredPort > 0 ? configuredPort : DEFAULT_PORT;
  for (let port = startPort; port < startPort + 20; port += 1) {
    if (await isPortAvailable(port)) return port;
  }
  return startPort;
}

const port = await findPort();
const lan = chooseLanAddress();

console.log("");
console.log(`局域网访问地址：${lan ? `http://${lan.address}:${port}` : `未识别到局域网地址，请使用 localhost:${port}`}`);
console.log(`本机访问地址：http://localhost:${port}`);
console.log("");

const nextCommand = resolve(process.cwd(), "node_modules", "next", "dist", "bin", "next");
const nextProcess = spawn(process.execPath, [nextCommand, "dev", "--hostname", "0.0.0.0", "--port", String(port)], {
  stdio: "inherit",
  shell: false,
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => nextProcess.kill(signal));
}

nextProcess.on("exit", (code, signal) => {
  process.exitCode = code ?? (signal ? 1 : 0);
});
