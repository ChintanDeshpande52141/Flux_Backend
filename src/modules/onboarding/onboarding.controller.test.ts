jest.mock("./onboarding.service", () => ({
  getOnboardingData: jest.fn(),
  saveOnboardingData: jest.fn(),
  updateOnboardingData: jest.fn(),
}));

import {
  getOnboardingData,
  saveOnboardingData,
  updateOnboardingData,
} from "./onboarding.service";
import {
  handleGetOnboarding,
  handleSaveOnboarding,
  handleUpdateOnboarding,
} from "./onboarding.controller";

function mockReqRes(body: unknown = {}) {
  const req = { userId: "user-1", userEmail: "user@example.com", body } as any;
  const res = {
    json: jest.fn(),
    status: jest.fn().mockReturnThis(),
  } as any;
  return { req, res };
}

describe("onboarding.controller error logging", () => {
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    jest.clearAllMocks();
  });

  it("handleGetOnboarding logs the caught error via console.error before responding", async () => {
    (getOnboardingData as jest.Mock).mockRejectedValueOnce(new Error("get onboarding boom"));
    const { req, res } = mockReqRes();

    await handleGetOnboarding(req, res);

    expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(500);
  });

  it("handleSaveOnboarding logs the caught error via console.error before responding", async () => {
    (saveOnboardingData as jest.Mock).mockRejectedValueOnce(new Error("save onboarding boom"));
    const { req, res } = mockReqRes();

    await handleSaveOnboarding(req, res);

    expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(500);
  });

  it("handleUpdateOnboarding logs the caught error via console.error before responding", async () => {
    (updateOnboardingData as jest.Mock).mockRejectedValueOnce(new Error("update onboarding boom"));
    const { req, res } = mockReqRes();

    await handleUpdateOnboarding(req, res);

    expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});
