jest.mock("./transactions.service", () => ({
  getTransactions: jest.fn(),
  createTransaction: jest.fn(),
  CreateTransactionSchema: {
    safeParse: jest.fn(() => ({
      success: true,
      data: {
        merchant: "Cafe",
        category: "Food",
        amount: 100,
        paymentType: "UPI",
        transactedAt: "2026-08-01T00:00:00.000Z",
      },
    })),
  },
}));

import { getTransactions, createTransaction } from "./transactions.service";
import {
  handleGetTransactions,
  handleCreateTransaction,
} from "./transactions.controller";

function mockReqRes(query: unknown = {}, body: unknown = {}) {
  const req = { userId: "user-1", query, body } as any;
  const res = {
    json: jest.fn(),
    status: jest.fn().mockReturnThis(),
  } as any;
  return { req, res };
}

describe("transactions.controller error logging", () => {
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    jest.clearAllMocks();
  });

  it("handleGetTransactions logs the caught error via console.error before responding", async () => {
    (getTransactions as jest.Mock).mockRejectedValueOnce(new Error("get transactions boom"));
    const { req, res } = mockReqRes();

    await handleGetTransactions(req, res);

    expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(500);
  });

  it("handleCreateTransaction logs the caught error via console.error before responding", async () => {
    (createTransaction as jest.Mock).mockRejectedValueOnce(new Error("create transaction boom"));
    const { req, res } = mockReqRes();

    await handleCreateTransaction(req, res);

    expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});
