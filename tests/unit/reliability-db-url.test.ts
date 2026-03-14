import { describe, expect, it } from "vitest";
import { resolveReliabilityDbUrl } from "@/scripts/reliability/db-url";

describe("resolveReliabilityDbUrl", () => {
  it("returns direct postgres url", () => {
    expect(
      resolveReliabilityDbUrl("postgresql://user:pass@localhost:5432/nexrel"),
    ).toBe("postgresql://user:pass@localhost:5432/nexrel");
  });

  it("extracts from shell-style assignment", () => {
    expect(
      resolveReliabilityDbUrl(
        "export RELIABILITY_DATABASE_URL=postgres://user:pass@db:5432/app",
      ),
    ).toBe("postgres://user:pass@db:5432/app");
  });

  it("extracts from quoted assignment", () => {
    expect(
      resolveReliabilityDbUrl(
        "DATABASE_URL='postgresql://user:pass@host:5432/db?sslmode=require'",
      ),
    ).toBe("postgresql://user:pass@host:5432/db?sslmode=require");
  });

  it("normalizes escaped and jdbc values", () => {
    expect(
      resolveReliabilityDbUrl(
        "jdbc:postgresql://db.example.com:5432/crm?sslmode=require",
      ),
    ).toBe("postgresql://db.example.com:5432/crm?sslmode=require");
  });

  it("returns empty for non-postgres url", () => {
    expect(
      resolveReliabilityDbUrl("mysql://user:pass@localhost:3306/app"),
    ).toBe("");
  });
});
