import { validateEnv } from "./env";

const REQUIRED = [
  "DATABASE_URL",
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "OPENROUTER_API_KEY",
];

describe("validateEnv", () => {
  const originalValues: Record<string, string | undefined> = {};
  let exitSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;

  beforeEach(() => {
    for (const key of REQUIRED) {
      originalValues[key] = process.env[key];
      process.env[key] = `test-${key}`;
    }
    exitSpy = jest.spyOn(process, "exit").mockImplementation(((): never => {
      throw new Error("process.exit called");
    }) as (code?: string | number | null) => never);
    errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    for (const key of REQUIRED) {
      if (originalValues[key] === undefined) delete process.env[key];
      else process.env[key] = originalValues[key];
    }
    exitSpy.mockRestore();
    errorSpy.mockRestore();
  });

  it("does not exit when all required vars are present", () => {
    expect(() => validateEnv()).not.toThrow();
    expect(exitSpy).not.toHaveBeenCalled();
  });

  it.each(REQUIRED)("exits with a clear error when %s is missing", (missingKey) => {
    delete process.env[missingKey];

    expect(() => validateEnv()).toThrow("process.exit called");

    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining(missingKey),
    );
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it("reports all missing vars at once when multiple are missing", () => {
    delete process.env.DATABASE_URL;
    delete process.env.OPENROUTER_API_KEY;

    expect(() => validateEnv()).toThrow("process.exit called");

    const message = errorSpy.mock.calls[0][0] as string;
    expect(message).toContain("DATABASE_URL");
    expect(message).toContain("OPENROUTER_API_KEY");
  });
});
