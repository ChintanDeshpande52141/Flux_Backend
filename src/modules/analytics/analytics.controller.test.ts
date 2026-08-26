jest.mock("./analytics.service", () => ({
  getSafeToSpend: jest.fn(),
  getSpendingVelocity: jest.fn(),
  getSpendingPulse: jest.fn(),
  getSpendingAnalysis: jest.fn(),
  getTotals: jest.fn(),
}));

import {
  getSafeToSpend,
  getSpendingVelocity,
  getSpendingPulse,
  getSpendingAnalysis,
  getTotals,
} from "./analytics.service";
import {
  handleSafeToSpend,
  handleSpendingVelocity,
  handleSpendingPulse,
  handleSpendingAnalysis,
  handleTotals,
} from "./analytics.controller";

function mockReqRes() {
  const req = { userId: "user-1", query: {} } as any;
  const res = {
    json: jest.fn(),
    status: jest.fn().mockReturnThis(),
  } as any;
  return { req, res };
}

describe("analytics.controller error logging", () => {
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    jest.clearAllMocks();
  });

  const cases: Array<[string, () => Promise<void>, jest.Mock]> = [
    [
      "handleSafeToSpend",
      async () => {
        const { req, res } = mockReqRes();
        await handleSafeToSpend(req, res);
      },
      getSafeToSpend as jest.Mock,
    ],
    [
      "handleSpendingVelocity",
      async () => {
        const { req, res } = mockReqRes();
        await handleSpendingVelocity(req, res);
      },
      getSpendingVelocity as jest.Mock,
    ],
    [
      "handleSpendingPulse",
      async () => {
        const { req, res } = mockReqRes();
        await handleSpendingPulse(req, res);
      },
      getSpendingPulse as jest.Mock,
    ],
    [
      "handleSpendingAnalysis",
      async () => {
        const { req, res } = mockReqRes();
        await handleSpendingAnalysis(req, res);
      },
      getSpendingAnalysis as jest.Mock,
    ],
    [
      "handleTotals",
      async () => {
        const { req, res } = mockReqRes();
        await handleTotals(req, res);
      },
      getTotals as jest.Mock,
    ],
  ];

  it.each(cases)(
    "%s logs the caught error via console.error before responding",
    async (_name, invoke, serviceMock) => {
      serviceMock.mockRejectedValueOnce(new Error("service boom"));

      await invoke();

      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      const loggedErr = consoleErrorSpy.mock.calls[0].find(
        (arg: unknown) => arg instanceof Error,
      );
      expect(loggedErr).toBeInstanceOf(Error);
      expect((loggedErr as Error).message).toBe("service boom");
    },
  );
});
