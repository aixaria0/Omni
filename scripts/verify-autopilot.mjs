#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { parseAutopilotReceipt, verifyAutopilotReceipt } from "../src/lib/osint/autopilot.ts";

const file = process.argv[2];
if (!file) {
  console.error("Usage: npm run verify:autopilot -- <receipt.autopilot.json>");
  process.exitCode = 2;
} else {
  try {
    const text = await readFile(resolve(file), "utf8");
    const receipt = parseAutopilotReceipt(text);
    const verification = verifyAutopilotReceipt(receipt);
    console.log(`VALID ${receipt.runId}`);
    console.log(`query=${receipt.query}`);
    console.log(`rounds=${receipt.rounds.length}`);
    console.log(`stop=${receipt.stopReason}`);
    console.log(`runRoot=${receipt.runRoot}`);
    console.log(`capsules=${verification.capsuleIntegrity ? "verified" : "failed"}`);
    console.log(`planner=${verification.plannerIntegrity ? "verified" : "failed"}`);
  } catch (error) {
    console.error(`INVALID ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  }
}
