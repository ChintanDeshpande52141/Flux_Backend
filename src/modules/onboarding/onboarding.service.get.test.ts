const mockPoolQuery = jest.fn();

jest.mock("../../config/db", () => ({
  pool: { query: (...args: unknown[]) => mockPoolQuery(...args) },
}));

import { getOnboardingData } from "./onboarding.service";

describe("getOnboardingData", () => {
  afterEach(() => {
    mockPoolQuery.mockReset();
  });

  it("rejects instead of silently continuing when provisioning the user row fails", async () => {
    mockPoolQuery.mockRejectedValueOnce(new Error("insert users boom"));

    await expect(getOnboardingData("user-1", "user@example.com")).rejects.toThrow(
      "insert users boom",
    );

    // The SELECT must never have been reached
    expect(mockPoolQuery).toHaveBeenCalledTimes(1);
  });

  it("still returns onboarding data when provisioning succeeds", async () => {
    mockPoolQuery
      .mockResolvedValueOnce({}) // INSERT users ON CONFLICT
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [
          {
            income_sources: [],
            credit_cards: [],
            total_income: "3000",
            savings_goal: "500",
            onboarded_at: "2026-08-01T00:00:00.000Z",
          },
        ],
      }); // SELECT

    const result = await getOnboardingData("user-1", "user@example.com");

    expect(result).not.toBeNull();
    expect(result?.total_income).toBe(3000);
  });
});
