import { Command } from "commander";
import { describe, expect, it } from "vitest";
import { registerAuthCommand } from "../../src/cli/commands/auth.js";

describe("auth revoke command", () => {
  it("--confirmがなければProvider通信前に拒否する", async () => {
    const program = new Command();
    program.exitOverride();
    registerAuthCommand(program);

    await expect(
      program.parseAsync(["node", "google-ads-cli", "auth", "revoke"]),
    ).rejects.toMatchObject({
      code: "commander.missingMandatoryOptionValue",
    });
  });

  it("同じOAuth grantへの影響をhelpへ明記する", () => {
    const program = new Command();
    registerAuthCommand(program);
    const auth = program.commands.find((command) => command.name() === "auth");
    const revoke = auth?.commands.find(
      (command) => command.name() === "revoke",
    );

    expect(revoke?.description()).toContain("同じGoogle OAuth grant");
    expect(revoke?.options[0]?.description).toContain("関連token/scopes");
  });
});
