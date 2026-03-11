import { describe, expect, it } from "vitest";
import { getExplicitVoiceNavigationTarget } from "@/lib/voice-navigation-policy";

describe("voice navigation policy", () => {
  it("does not navigate for generic mentions", () => {
    expect(getExplicitVoiceNavigationTarget("you have 5 contacts")).toBeNull();
    expect(
      getExplicitVoiceNavigationTarget("your pipeline is healthy"),
    ).toBeNull();
    expect(
      getExplicitVoiceNavigationTarget("campaign performance is up"),
    ).toBeNull();
  });

  it("navigates only on explicit transition language", () => {
    expect(
      getExplicitVoiceNavigationTarget(
        "contact created successfully, taking you to the contacts page now",
      ),
    ).toBe("/dashboard/contacts");

    expect(
      getExplicitVoiceNavigationTarget(
        "report is ready, i'll take you to the reports page",
      ),
    ).toBe("/dashboard/reports");
  });
});
