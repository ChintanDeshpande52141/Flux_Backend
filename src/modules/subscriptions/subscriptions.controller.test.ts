jest.mock("./subscriptions.service", () => ({
  getSubscriptions: jest.fn(),
  createSubscription: jest.fn(),
  updateSubscription: jest.fn(),
  deleteSubscription: jest.fn(),
  CreateSubscriptionSchema: {
    safeParse: jest.fn(() => ({
      success: true,
      data: {
        name: "Netflix",
        amount: 299,
        billingCycle: "monthly",
        nextBillingDate: "2026-09-01",
        category: "Entertainment",
      },
    })),
  },
  UpdateSubscriptionSchema: {
    safeParse: jest.fn(() => ({ success: true, data: { amount: 299 } })),
  },
}));

import {
  getSubscriptions,
  createSubscription,
  updateSubscription,
  deleteSubscription,
} from "./subscriptions.service";
import {
  handleGetSubscriptions,
  handleCreateSubscription,
  handleUpdateSubscription,
  handleDeleteSubscription,
} from "./subscriptions.controller";

function mockReqRes(params: unknown = {}, body: unknown = {}) {
  const req = { userId: "user-1", params, body } as any;
  const res = {
    json: jest.fn(),
    status: jest.fn().mockReturnThis(),
  } as any;
  return { req, res };
}

describe("subscriptions.controller error logging", () => {
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    jest.clearAllMocks();
  });

  it("handleGetSubscriptions logs the caught error via console.error before responding", async () => {
    (getSubscriptions as jest.Mock).mockRejectedValueOnce(new Error("get subs boom"));
    const { req, res } = mockReqRes();

    await handleGetSubscriptions(req, res);

    expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(500);
  });

  it("handleCreateSubscription logs the caught error via console.error before responding", async () => {
    (createSubscription as jest.Mock).mockRejectedValueOnce(new Error("create sub boom"));
    const { req, res } = mockReqRes();

    await handleCreateSubscription(req, res);

    expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(500);
  });

  it("handleUpdateSubscription logs the caught error via console.error before responding", async () => {
    (updateSubscription as jest.Mock).mockRejectedValueOnce(new Error("update sub boom"));
    const { req, res } = mockReqRes({ id: "sub-1" });

    await handleUpdateSubscription(req, res);

    expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(500);
  });

  it("handleDeleteSubscription logs the caught error via console.error before responding", async () => {
    (deleteSubscription as jest.Mock).mockRejectedValueOnce(new Error("delete sub boom"));
    const { req, res } = mockReqRes({ id: "sub-1" });

    await handleDeleteSubscription(req, res);

    expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});
