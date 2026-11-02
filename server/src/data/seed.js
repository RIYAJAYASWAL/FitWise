import seedDatabase from "../../scripts/seed.js";

seedDatabase()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ Seed execution failed:", err);
    process.exit(1);
  });
