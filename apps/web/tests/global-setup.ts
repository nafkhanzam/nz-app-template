import { execSync } from "child_process";

export default async function globalSetup() {
  console.log("Running database seed...");
  execSync("pnpm db:seed", {
    cwd: "../server",
    stdio: "inherit",
  });
  console.log("Database seeded successfully.");
}
