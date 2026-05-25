import { seedDemoData } from "@/lib/seed";

seedDemoData()
  .then(() => {
    console.log("Demo database seeded.");
  })
  .catch((error: unknown) => {
    console.error("Failed to seed demo database", error);
    process.exit(1);
  });
