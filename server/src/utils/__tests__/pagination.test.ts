import { describe, it, expect } from "vitest";
import { parsePagination, buildMeta } from "../pagination";

describe("parsePagination", () => {
  it("defaults page to 1 and provides a sane limit", () => {
    const p = parsePagination({});
    expect(p.page).toBe(1);
    expect(p.limit).toBeGreaterThan(0);
    expect(p.skip).toBe(0);
  });

  it("computes skip from page and limit", () => {
    const p = parsePagination({ page: "3", limit: "10" });
    expect(p.page).toBe(3);
    expect(p.limit).toBe(10);
    expect(p.skip).toBe(20);
  });

  it("clamps page to a minimum of 1", () => {
    expect(parsePagination({ page: "-5" }).page).toBe(1);
    expect(parsePagination({ page: "0" }).page).toBe(1);
  });

  it("clamps limit to the max (never unbounded)", () => {
    const p = parsePagination({ limit: "100000" });
    expect(p.limit).toBeLessThanOrEqual(200);
  });

  it("clamps limit to a minimum of 1", () => {
    expect(parsePagination({ limit: "0" }).limit).toBeGreaterThanOrEqual(1);
  });
});

describe("buildMeta", () => {
  it("computes totalPages by ceiling", () => {
    const meta = buildMeta(45, { page: 1, limit: 20, skip: 0 });
    expect(meta.total).toBe(45);
    expect(meta.totalPages).toBe(3);
  });
});
