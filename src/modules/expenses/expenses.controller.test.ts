jest.mock("./expenses.service", () => ({
  createExpense: jest.fn(),
  getExpenses: jest.fn(),
}));

import { createExpense, getExpenses } from "./expenses.service";
import { handleCreateExpense, handleGetExpenses } from "./expenses.controller";

function mockReqRes(query: unknown = {}, body: unknown = {}) {
  const req = { userId: "user-1", query, body } as any;
  const res = {
    json: jest.fn(),
    status: jest.fn().mockReturnThis(),
  } as any;
  return { req, res };
}

describe("expenses.controller error logging", () => {
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    jest.clearAllMocks();
  });

  it("handleCreateExpense logs the caught error via console.error before responding", async () => {
    (createExpense as jest.Mock).mockRejectedValueOnce(new Error("create expense boom"));
    const { req, res } = mockReqRes(
      {},
      {
        amount: 100,
        description: "Cafe",
        category: "Food",
        paymentType: "UPI",
        isRecurring: false,
      },
    );

    await handleCreateExpense(req, res);

    expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(500);
  });

  it("handleGetExpenses logs the caught error via console.error before responding", async () => {
    (getExpenses as jest.Mock).mockRejectedValueOnce(new Error("get expenses boom"));
    const { req, res } = mockReqRes();

    await handleGetExpenses(req, res);

    expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});
