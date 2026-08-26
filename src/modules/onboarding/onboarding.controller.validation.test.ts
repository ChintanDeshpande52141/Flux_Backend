jest.mock("./onboarding.service", () => ({
  getOnboardingData: jest.fn(),
  saveOnboardingData: jest.fn(),
  updateOnboardingData: jest.fn(),
}));

import { saveOnboardingData, updateOnboardingData } from "./onboarding.service";
import { handleSaveOnboarding, handleUpdateOnboarding } from "./onboarding.controller";

function mockReqRes(body: unknown = {}) {
  const req = { userId: "user-1", userEmail: "user@example.com", body } as any;
  const res = {
    json: jest.fn(),
    status: jest.fn().mockReturnThis(),
  } as any;
  return { req, res };
}

describe("onboarding.controller request validation", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("handleSaveOnboarding returns 400 for a malformed total_income before calling the service", async () => {
    const { req, res } = mockReqRes({
      income_sources: [],
      credit_cards: [],
      total_income: "not-a-number",
      savings_goal: 500,
    });

    await handleSaveOnboarding(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(saveOnboardingData).not.toHaveBeenCalled();
  });

  it("handleSaveOnboarding calls the service for a valid body", async () => {
    (saveOnboardingData as jest.Mock).mockResolvedValueOnce(undefined);
    const { req, res } = mockReqRes({
      income_sources: [{ name: "Salary", amount: 3000 }],
      credit_cards: [],
      total_income: 3000,
      savings_goal: 500,
    });

    await handleSaveOnboarding(req, res);

    expect(saveOnboardingData).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalledWith(400);
  });

  it("handleUpdateOnboarding returns 400 for a malformed savings_goal before calling the service", async () => {
    const { req, res } = mockReqRes({ savings_goal: "lots" });

    await handleUpdateOnboarding(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(updateOnboardingData).not.toHaveBeenCalled();
  });

  it("handleUpdateOnboarding calls the service for a valid partial body", async () => {
    (updateOnboardingData as jest.Mock).mockResolvedValueOnce(undefined);
    const { req, res } = mockReqRes({ total_income: 4000 });

    await handleUpdateOnboarding(req, res);

    expect(updateOnboardingData).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalledWith(400);
  });
});
