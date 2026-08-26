const mockPoolQuery = jest.fn();

jest.mock("../../config/db", () => ({
  pool: { query: (...args: unknown[]) => mockPoolQuery(...args) },
}));

import { getTransactions } from "./transactions.service";

describe("getTransactions pagination", () => {
  afterEach(() => {
    mockPoolQuery.mockReset();
  });

  it("adds a LIMIT/OFFSET clause bound to the given limit and offset", async () => {
    mockPoolQuery.mockResolvedValueOnce({ rows: [] });

    await getTransactions("user-1", "This Month", "All", "All", undefined, undefined, 20, 40);

    const [sql, params] = mockPoolQuery.mock.calls[0];
    expect(sql).toMatch(/LIMIT \$\d+ OFFSET \$\d+/);
    expect(params).toContain(20);
    expect(params).toContain(40);
  });

  it("defaults to limit 50 offset 0 when not provided", async () => {
    mockPoolQuery.mockResolvedValueOnce({ rows: [] });

    await getTransactions("user-1", "This Month", "All", "All");

    const [, params] = mockPoolQuery.mock.calls[0];
    expect(params[params.length - 2]).toBe(50);
    expect(params[params.length - 1]).toBe(0);
  });
});
