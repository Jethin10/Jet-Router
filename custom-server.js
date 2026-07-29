const http = require("http");
const fs = require("fs");
const path = require("path");

try {
  require("@next/env").loadEnvConfig(process.cwd(), false);
} catch {
  // The standalone bundle already receives its environment from the process.
}

process.env.NODE_ENV ||= "production";
process.env.PORT ||= "20128";
process.env.HOSTNAME ||= "0.0.0.0";

function assertProductionConfiguration() {
  if (process.env.NODE_ENV !== "production") return;
  if (process.env.JET_ROUTER_ALLOW_INSECURE_DEFAULTS === "true") return;

  const requirements = [
    ["JWT_SECRET", 32],
    ["API_KEY_SECRET", 32],
    ["MACHINE_ID_SALT", 16],
    ["INITIAL_PASSWORD", 12],
  ];
  const invalid = requirements
    .filter(([name, minimum]) => {
      const value = process.env[name]?.trim() || "";
      return value.length < minimum || /^(change-me|endpoint-proxy|password$|123456$)/i.test(value);
    })
    .map(([name, minimum]) => `${name} (minimum ${minimum} characters)`);

  if (process.env.JWT_SECRET && process.env.JWT_SECRET === process.env.API_KEY_SECRET) {
    invalid.push("API_KEY_SECRET (must differ from JWT_SECRET)");
  }

  if (invalid.length > 0) {
    throw new Error(
      `Refusing to start Jet Router with insecure production configuration: ${invalid.join(", ")}. ` +
      "Set unique secrets in .env or explicitly set JET_ROUTER_ALLOW_INSECURE_DEFAULTS=true for an isolated test environment."
    );
  }
}

assertProductionConfiguration();

const origCreate = http.createServer.bind(http);

// Wrap Next standalone HTTP server: derive client IP from the TCP socket
// (unspoofable) and strip client-supplied forwarding headers so downstream
// rate-limiting keys on the real peer address instead of attacker-controlled XFF.
http.createServer = (...args) => {
  const handler = args.find((a) => typeof a === "function");
  const rest = args.filter((a) => typeof a !== "function");
  if (!handler) return origCreate(...args);
  const wrapped = (req, res) => {
    const socketIp = req.socket && req.socket.remoteAddress ? req.socket.remoteAddress : "";
    const xff = req.headers["x-forwarded-for"];
    const xRealIp = req.headers["x-real-ip"];
    const viaProxy = !!(xff || xRealIp);
    const isLoopbackProxy = socketIp === "127.0.0.1" || socketIp === "::1" || socketIp === "::ffff:127.0.0.1";
    // Trust forwarding headers only when the TCP peer is a local reverse proxy.
    // Direct/public sockets remain keyed by the unspoofable peer address.
    const proxyIp = xRealIp || (xff ? String(xff).split(",")[0].trim() : "");
    const ip = isLoopbackProxy && proxyIp ? proxyIp : socketIp;
    delete req.headers["x-jr-real-ip"];
    delete req.headers["x-forwarded-for"];
    delete req.headers["x-jr-via-proxy"];
    req.headers["x-jr-real-ip"] = ip;
    if (viaProxy) req.headers["x-jr-via-proxy"] = "1";
    return handler(req, res);
  };
  return origCreate(...rest, wrapped);
};

const bundledServer = path.join(__dirname, "server.js");
const localStandaloneServer = path.join(__dirname, ".next", "standalone", "server.js");
const serverEntry = fs.existsSync(bundledServer) ? bundledServer : localStandaloneServer;

if (!fs.existsSync(serverEntry)) {
  throw new Error("Jet Router production bundle is missing. Run `npm run build` before `npm start`.");
}

require(serverEntry);
