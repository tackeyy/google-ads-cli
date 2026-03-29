#!/usr/bin/env node
import { Command } from "commander";
import { registerAuthCommand } from "./commands/auth.js";
import { registerCampaignsCommand } from "./commands/campaigns.js";
import { registerInsightsCommand } from "./commands/insights.js";
import { registerCreateCommand } from "./commands/create.js";

const program = new Command();

program
  .name("google-ads-cli")
  .description("Google Ads CLI — キャンペーン・インサイト管理")
  .version("0.1.0");

registerAuthCommand(program);
registerCampaignsCommand(program);
registerInsightsCommand(program);
registerCreateCommand(program);

program.parse();
