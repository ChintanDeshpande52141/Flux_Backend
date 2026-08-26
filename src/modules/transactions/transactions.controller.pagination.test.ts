jest.mock("./transactions.service", () => ({
  getTransactions: jest.fn(),
  createTransaction: jest.fn(),
  CreateTransactionSchema: { safeParse: jest.fn() },
}));

import { getTransactions } from "./transactions.service";
import { handleGetTransactions } from "./transactions.controller";

function mockReqRes(query: unknown = {}) {
  const req = { userId: "user-1", query } as any;
  const res = {
    json: jest.fn(),
    status: jest.fn().mockReturnThis(),
  } as any;
  return { req, res };
}

describe("handleGetTransactions request validation and pagination", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("returns 400 for an invalid period/date combination without calling the service", async () => {
    const { req, res } = mockReqRes({ period: "Custom" }); // missing start/end

    await handleGetTransactions(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(getTransactions).not.toHaveBeenCalled();
  });

  it("returns 400 for an invalid pagination param without calling the service", async () => {
    const { req, res } = mockReqRes({ limit: "not-a-number" });

    await handleGetTransactions(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(getTransactions).not.toHaveBeenCalled();
  });

  it("passes validated limit/offset through to the service", async () => {
    (getTransactions as jest.Mock).mockResolvedValueOnce([]);
    const { req, res } = mockReqRes({ limit: "20", offset: "40" });

    await handleGetTransactions(req, res);

    expect(getTransactions).toHaveBeenCalledWith(
      "user-1",
      "This Month",
      "All",
      "All",
      undefined,
      undefined,
      20,
      40,
    );
  });

  it("defaults limit/offset to 50/0 when omitted", async () => {
    (getTransactions as jest.Mock).mockResolvedValueOnce([]);
    const { req, res } = mockReqRes({});

    await handleGetTransactions(req, res);

    expect(getTransactions).toHaveBeenCalledWith(
      "user-1",
      "This Month",
      "All",
      "All",
      undefined,
      undefined,
      50,
      0,
    );
  });
});
