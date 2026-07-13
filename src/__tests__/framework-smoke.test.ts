describe("test framework smoke test", () => {
  it("runs TypeScript tests via ts-jest", () => {
    const add = (a: number, b: number): number => a + b;
    expect(add(2, 3)).toBe(5);
  });
});
