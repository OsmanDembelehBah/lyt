import { describe, expect, test } from "bun:test";
import {
  SIERRA_LEONE_DISTRICTS,
  evaluateRisk,
  SEEDED_DEMO_SCENARIOS,
  RiskPayload,
} from "./riskEngine";

describe("Lyt Risk Engine & Sierra Leone Geo-Hierarchy", () => {
  test("contains 16 Sierra Leone districts with valid chiefdom coordinates", () => {
    expect(SIERRA_LEONE_DISTRICTS.length).toBe(16);

    SIERRA_LEONE_DISTRICTS.forEach((d) => {
      expect(d.id).toBeDefined();
      expect(d.name).toBeDefined();
      expect(d.province).toBeDefined();
      expect(d.chiefdoms.length).toBeGreaterThan(0);

      d.chiefdoms.forEach((c) => {
        expect(c.lat).toBeGreaterThanOrEqual(6.5);
        expect(c.lat).toBeLessThanOrEqual(10.2);
        expect(c.lon).toBeGreaterThanOrEqual(-13.5);
        expect(c.lon).toBeLessThanOrEqual(-10.0);
        expect(c.primaryCrops.length).toBeGreaterThan(0);
      });
    });
  });

  test("generates structured RiskPayload with strict non-negotiable contracts", () => {
    const kambia = SIERRA_LEONE_DISTRICTS.find((d) => d.id === "kambia")!;
    const magbema = kambia.chiefdoms.find((c) => c.id === "magbema")!;

    const payload: RiskPayload = evaluateRisk(magbema, kambia, {
      rain24hMm: 72.5,
      tempMaxC: 30.0,
      dustPm10: 50,
      windGustKmh: 40,
    });

    // 1. Mandatory Disclaimer contract
    expect(payload.disclaimer).toBe("Advisory from Lyt, not an official warning.");

    // 2. Severity & Probability Intervals
    expect(payload.severity).toBe("critical");
    expect(payload.hazardType).toBe("heavy_rain");
    expect(payload.probability).toBeGreaterThan(0.8);
    expect(payload.probabilityInterval[0]).toBeLessThan(payload.probabilityInterval[1]);
    expect(payload.probabilityInterval[0]).toBeGreaterThanOrEqual(0.0);
    expect(payload.probabilityInterval[1]).toBeLessThanOrEqual(1.0);

    // 3. Root Cause present
    expect(payload.rootCause).toContain("ITCZ");
    expect(payload.rootCause.length).toBeGreaterThan(30);

    // 4. Non-negotiable: Farmer advice MUST BE marked reviewed: false (draft)
    expect(payload.farmerAdvice.reviewed).toBe(false);
    expect(payload.farmerAdvice.action.length).toBeGreaterThan(15);
    expect(payload.farmerAdvice.cropTarget).toBe("Lowland Rice");

    // 5. Data Status badge label
    expect(payload.dataStatus).toBe("MODELED");
  });

  test("evaluates all seeded demo crisis scenarios cleanly", () => {
    Object.entries(SEEDED_DEMO_SCENARIOS).forEach(([key, scenario]) => {
      let foundChiefdom = null;
      let foundDistrict = null;

      for (const d of SIERRA_LEONE_DISTRICTS) {
        const c = d.chiefdoms.find((ch) => ch.id === scenario.chiefdomId);
        if (c) {
          foundChiefdom = c;
          foundDistrict = d;
          break;
        }
      }

      expect(foundChiefdom).not.toBeNull();
      expect(foundDistrict).not.toBeNull();

      const payload = evaluateRisk(foundChiefdom!, foundDistrict!, scenario.inputs);
      expect(payload.severity).not.toBe("low");
      expect(payload.hazardType).toBe(scenario.hazard);
      expect(payload.farmerAdvice.reviewed).toBe(false);
      expect(payload.disclaimer).toBe("Advisory from Lyt, not an official warning.");
    });
  });
});
