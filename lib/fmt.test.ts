import { describe, expect, it } from "vitest";
import { fmtBRL } from "./fmt";

describe("fmtBRL", () => {
  it("usa vírgula decimal", () => {
    expect(fmtBRL(3500)).toBe("R$ 35,00");
    expect(fmtBRL(18050)).toBe("R$ 180,50");
  });

  it("separa milhar com ponto", () => {
    expect(fmtBRL(200000)).toBe("R$ 2.000,00");
    expect(fmtBRL(150000)).toBe("R$ 1.500,00");
    expect(fmtBRL(123456789)).toBe("R$ 1.234.567,89");
  });
});
