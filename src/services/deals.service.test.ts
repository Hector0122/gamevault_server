import { describe, expect, it } from "vitest";
import { isSimilarTitle } from "./deals.service.js";

describe("isSimilarTitle", () => {
  it("reconoce el mismo título exacto", () => {
    expect(isSimilarTitle("The Witcher 3", "The Witcher 3")).toBe(true);
  });

  it("ignora diferencias de mayúsculas/minúsculas", () => {
    expect(isSimilarTitle("hades", "HADES")).toBe(true);
  });

  it("reconoce ediciones especiales del mismo juego", () => {
    expect(
      isSimilarTitle(
        "Divinity: Original Sin 2",
        "Divinity: Original Sin 2 - Definitive Edition"
      )
    ).toBe(true);
    expect(
      isSimilarTitle("Skyrim", "The Elder Scrolls V: Skyrim Special Edition")
    ).toBe(true);
  });

  it("no confunde juegos sin relación entre sí", () => {
    expect(isSimilarTitle("Hades", "Celeste")).toBe(false);
  });

  it("no marca como similares secuelas con subtítulos distintos", () => {
    expect(
      isSimilarTitle("Grand Theft Auto V", "Grand Theft Auto: Vice City")
    ).toBe(false);
  });

  it("no confunde una secuela numerada con una reedición del original", () => {
    // Bug real: tras quitarle "Definitive Edition", "Dishonored: Definitive
    // Edition" queda en "dishonored", que es prefijo de "dishonored 2" —
    // eso los marcaba como el mismo juego y filtraba secuelas legítimas de
    // las recomendaciones.
    expect(
      isSimilarTitle("Dishonored 2", "Dishonored: Definitive Edition")
    ).toBe(false);
    expect(isSimilarTitle("Mass Effect 2", "Mass Effect")).toBe(false);
    expect(isSimilarTitle("Final Fantasy XVI", "Final Fantasy VII")).toBe(
      false
    );
  });
});
