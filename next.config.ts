import type { NextConfig } from "next";
import { networkInterfaces } from "node:os";

const localNetworkOrigins = [
  "127.0.0.1",
  "0.0.0.0",
  ...Object.values(networkInterfaces())
    .flatMap((entries) => entries ?? [])
    .filter((entry) => entry.family === "IPv4" && !entry.internal)
    .map((entry) => entry.address),
];

const nextConfig: NextConfig = {
  allowedDevOrigins: localNetworkOrigins,
};

export default nextConfig;
