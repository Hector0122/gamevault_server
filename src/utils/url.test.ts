import { describe, expect, it } from "vitest";
import { isAllowedImageUrl } from "./url.js";

describe("isAllowedImageUrl", () => {
  it("permite URLs https de images.igdb.com", () => {
    expect(
      isAllowedImageUrl(
        "https://images.igdb.com/igdb/image/upload/t_cover_big/abc123.jpg"
      )
    ).toBe(true);
  });

  it("permite subdominios de igdb.com", () => {
    expect(isAllowedImageUrl("https://media.igdb.com/foo.jpg")).toBe(true);
  });

  it("rechaza dominios que solo contienen 'igdb' como substring", () => {
    expect(isAllowedImageUrl("https://notigdb.com/foo.jpg")).toBe(false);
    expect(isAllowedImageUrl("https://igdb.com.evil.com/foo.jpg")).toBe(
      false
    );
  });

  it("rechaza URLs http (no https)", () => {
    expect(isAllowedImageUrl("http://images.igdb.com/foo.jpg")).toBe(false);
  });

  it("rechaza IPs y hosts internos", () => {
    expect(isAllowedImageUrl("https://169.254.169.254/latest/meta-data")).toBe(
      false
    );
    expect(isAllowedImageUrl("https://localhost/secret")).toBe(false);
    expect(isAllowedImageUrl("https://10.0.0.5/internal")).toBe(false);
  });

  it("rechaza valores que no son URLs válidas", () => {
    expect(isAllowedImageUrl("not-a-url")).toBe(false);
    expect(isAllowedImageUrl("")).toBe(false);
  });
});
