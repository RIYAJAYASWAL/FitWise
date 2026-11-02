/**
 * Chart Doctor Nightly Job
 * Schedules node-cron nightly at 02:00 ONLY when ENABLE_CRON=true.
 * Exports runNow() for on-demand execution.
 * Supports standalone CLI invocation: node src/jobs/chartDoctorJob.js --once
 */

import cron from "node-cron";
import path from "path";
import { fileURLToPath } from "url";
import { chartDoctorService } from "../services/chartDoctorService.js";
import { env } from "../config/env.js";
import { connectDB, disconnectDB } from "../config/db.js";

/**
 * Triggers Chart Doctor immediately and returns the number of active flags.
 *
 * @returns {Promise<number>}
 */
export async function runNow() {
  return await chartDoctorService.run();
}

/**
 * Schedules Chart Doctor to run nightly at 02:00 (0 2 * * *)
 * ONLY when ENABLE_CRON=true.
 *
 * @returns {import("node-cron").ScheduledTask|null}
 */
export function initChartDoctorJob() {
  if (!env.ENABLE_CRON) {
    return null;
  }

  console.log("⏰ Scheduling Chart Doctor cron job nightly at 02:00 (0 2 * * *)...");
  const job = cron.schedule("0 2 * * *", async () => {
    try {
      console.log("🩺 [CRON 02:00] Starting nightly Chart Doctor run...");
      const flagged = await runNow();
      console.log(`✅ [CRON 02:00] Chart Doctor completed. ${flagged} products/sizes flagged.`);
    } catch (err) {
      console.error("❌ [CRON 02:00] Chart Doctor execution failed:", err.message);
    }
  });

  return job;
}

// Automatically initialize cron schedule if imported in running application
let activeJob = null;
if (env.ENABLE_CRON && env.NODE_ENV !== "test") {
  activeJob = initChartDoctorJob();
}

// Standalone CLI invocation: node src/jobs/chartDoctorJob.js --once
const currentFilePath = fileURLToPath(import.meta.url);
const invokedScriptPath = process.argv[1] ? path.resolve(process.argv[1]) : "";
const isDirectExecution = currentFilePath === invokedScriptPath;

if (isDirectExecution && process.argv.includes("--once")) {
  (async () => {
    try {
      console.log("🩺 Running Chart Doctor standalone (--once)...");
      await connectDB();
      const flagged = await runNow();
      console.log(`✨ Standalone Chart Doctor completed successfully. Total flagged: ${flagged}`);
      await disconnectDB();
      process.exit(0);
    } catch (err) {
      console.error("❌ Standalone Chart Doctor failed:", err);
      process.exit(1);
    }
  })();
}

export default {
  runNow,
  initChartDoctorJob,
  activeJob,
};
