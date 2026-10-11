import { describe, expect, it } from "vitest";
import { CURRENT_SCHEMA_VERSION, openDatabase } from "../src/index";
import { drivers } from "./drivers";

describe.each(drivers)("openDatabase ($name)", ({ create }) => {
  it("brings an empty database to the current schema version", () => {
    const { schemaVersion } = openDatabase(create());
    expect(schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
  });

  it("is idempotent: opening an already migrated database changes nothing", () => {
    const driver = create();
    openDatabase(driver);
    const again = openDatabase(driver);
    expect(again.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
  });

  it("rejects a database created by a newer version of the app", () => {
    const driver = create();
    openDatabase(driver);
    driver.run("INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)", [
      CURRENT_SCHEMA_VERSION + 1,
      "2099-01-01T00:00:00Z",
    ]);
    expect(() => openDatabase(driver)).toThrow(/mais nova/i);
  });
});
