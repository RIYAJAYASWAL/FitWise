/**
 * Local MongoDB Runner using MongoMemoryServer
 * Runs on port 27017 for native local development without Docker.
 */

import { MongoMemoryServer } from "mongodb-memory-server";

console.log("🌱 Starting local MongoDB instance on port 27017...");

const mongod = await MongoMemoryServer.create({
  instance: {
    port: 27017,
    dbName: "fitwise_dev",
  },
});

console.log(`✅ Local MongoDB running successfully at ${mongod.getUri()}`);

const handleExit = async () => {
  console.log("\nShutting down local MongoDB instance...");
  await mongod.stop();
  process.exit(0);
};

process.on("SIGINT", handleExit);
process.on("SIGTERM", handleExit);
