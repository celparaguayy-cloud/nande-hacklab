import { describe, expect, it } from "vitest";
import { md5, sha256, guessAlgo } from "./hash";

describe("MD5 (vectores oficiales)", () => {
  it("cadena vacía", () => {
    expect(md5("")).toBe("d41d8cd98f00b204e9800998ecf8427e");
  });
  it('"abc"', () => {
    expect(md5("abc")).toBe("900150983cd24fb0d6963f7d28e17f72");
  });
  it('"The quick brown fox jumps over the lazy dog"', () => {
    expect(md5("The quick brown fox jumps over the lazy dog")).toBe(
      "9e107d9d372bb6826bd81d3542a419d6",
    );
  });
  it('"password"', () => {
    expect(md5("password")).toBe("5f4dcc3b5aa765d61d8327deb882cf99");
  });
});

describe("SHA-256 (vectores oficiales)", () => {
  it("cadena vacía", () => {
    expect(sha256("")).toBe(
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    );
  });
  it('"abc"', () => {
    expect(sha256("abc")).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
  });
});

describe("identificación de algoritmo", () => {
  it("reconoce md5 y sha256 por longitud", () => {
    expect(guessAlgo(md5("x"))).toBe("md5");
    expect(guessAlgo(sha256("x"))).toBe("sha256");
    expect(guessAlgo("nope")).toBe("desconocido");
  });
});
