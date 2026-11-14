import { describe, expect, it } from "vitest";
import { designConfigSchema } from "@/validators/design";

describe("designConfigSchema", () => {
  it("accepts a valid editable design JSON", () => {
    const result = designConfigSchema.safeParse({
      version: 1,
      type: "EVENT_TICKET",
      canvas: { width: 1200, height: 500, unit: "px" },
      elements: [{ id: "title", type: "text", x: 20, y: 20, text: "Concert" }],
    });
    expect(result.success).toBe(true);
  });

  it("rejects executable fields at the design root", () => {
    const result = designConfigSchema.safeParse({
      version: 1, type: "EVENT_TICKET", canvas: { width: 1200, height: 500 }, elements: [],
      script: "process.env.SECRET",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid canvas dimensions and unknown element types", () => {
    expect(designConfigSchema.safeParse({ version: 1, type: "CUSTOM", canvas: { width: -1, height: 10 }, elements: [] }).success).toBe(false);
    expect(designConfigSchema.safeParse({ version: 1, type: "CUSTOM", canvas: { width: 10, height: 10 }, elements: [{ id: "x", type: "script", x: 1, y: 1 }] }).success).toBe(false);
  });
});

