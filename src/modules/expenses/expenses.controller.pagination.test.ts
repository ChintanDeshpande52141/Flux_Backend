jest.mock("./expenses.service", () => ({
  createExpense: jest.fn(),
  getExpenses: jest.fn(),
}));

import { getExpenses } from "./expenses.service";
import { handleGetExpenses } from "./expenses.controller";

function mockReqRes(query: unknown = {}) {
  const req = { userId: "user-1", query } as any;
  const res = {
    json: jest.fn(),
    status: jest.fn().mockReturnThis(),
  } as any;
  return { req, res };
}

describe("handleGetExpenses limit/offset validation", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("returns 400 for limit=-1 instead of a NaN-driven 500", async () => {
    const { req, res } = mockReqRes({ limit: "-1" });

    await handleGetExpenses(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(getExpenses).not.toHaveBeenCalled();
  });

  it("returns 400 for limit=abc instead of a NaN-driven 500", async () => {
    const { req, res } = mockReqRes({ limit: "abc" });

    await handleGetExpenses(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(getExpenses).not.toHaveBeenCalled();
  });

  it("returns 400 for a negative offset", async () => {
    const { req, res } = mockReqRes({ offset: "-5" });

    await handleGetExpenses(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(getExpenses).not.toHaveBeenCalled();
  });

  it("returns 400 for a limit above the 200 max", async () => {
    const { req, res } = mockReqRes({ limit: "500" });

    await handleGetExpenses(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(getExpenses).not.toHaveBeenCalled();
  });

  it("defaults limit=50, offset=0 when params are omitted", async () => {
    (getExpenses as jest.Mock).mockResolvedValueOnce([]);
    const { req, res } = mockReqRes({});

    await handleGetExpenses(req, res);

    expect(getExpenses).toHaveBeenCalledWith("user-1", 50, 0, undefined);
  });

  it("passes validated limit/offset/category through to the service", async () => {
    (getExpenses as jest.Mock).mockResolvedValueOnce([]);
    const { req, res } = mockReqRes({ limit: "10", offset: "20", category: "Food" });

    await handleGetExpenses(req, res);

    expect(getExpenses).toHaveBeenCalledWith("user-1", 10, 20, "Food");
  });
});
