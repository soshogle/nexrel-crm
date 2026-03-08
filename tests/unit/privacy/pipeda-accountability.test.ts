import { afterEach, describe, expect, it, vi } from "vitest";
import { getPipedaAccountabilityProfile } from "@/lib/privacy/pipeda-accountability";

describe("PIPEDA accountability profile", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns designated privacy official defaults", () => {
    const profile = getPipedaAccountabilityProfile();
    expect(profile.designatedOfficial.title).toBe("Privacy Officer");
    expect(profile.designatedOfficial.email).toBe("privacy@soshogle.com");
  });

  it("reflects encryption posture from env configuration", () => {
    vi.stubEnv("NEXTAUTH_URL", "https://app.example.com");
    vi.stubEnv("ENCRYPTION_SECRET", "test-secret");

    const profile = getPipedaAccountabilityProfile();
    expect(profile.encryptionPosture.transportEncryption.httpsConfigured).toBe(
      true,
    );
    expect(
      profile.encryptionPosture.atRestEncryption.fieldLevelEncryptionConfigured,
    ).toBe(true);
  });
});
