jest.mock("./chat.service", () => ({
  getMessages: jest.fn(),
  processUserMessage: jest.fn(),
  getSuggestions: jest.fn(),
  parseWithAI: jest.fn(),
}));

import { getMessages, processUserMessage, getSuggestions } from "./chat.service";
import {
  handleGetMessages,
  handleSendMessage,
  handleGetSuggestions,
  handleTestAI,
} from "./chat.controller";

function mockReqRes(body: unknown = {}) {
  const req = { userId: "user-1", body } as any;
  const res = {
    json: jest.fn(),
    status: jest.fn().mockReturnThis(),
  } as any;
  return { req, res };
}

describe("chat.controller error logging", () => {
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    jest.clearAllMocks();
  });

  it("handleGetMessages logs the caught error via console.error before responding", async () => {
    (getMessages as jest.Mock).mockRejectedValueOnce(new Error("get messages boom"));
    const { req, res } = mockReqRes();

    await handleGetMessages(req, res);

    expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(500);
  });

  it("handleSendMessage logs the caught error via console.error before responding", async () => {
    (processUserMessage as jest.Mock).mockRejectedValueOnce(new Error("send message boom"));
    const { req, res } = mockReqRes({ text: "hi", sender: "user" });

    await handleSendMessage(req, res);

    expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(500);
  });

  it("handleGetSuggestions logs the caught error via console.error before responding", async () => {
    (getSuggestions as jest.Mock).mockRejectedValueOnce(new Error("suggestions boom"));
    const { req, res } = mockReqRes();

    await handleGetSuggestions(req, res);

    expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(500);
  });

  it("handleTestAI logs the caught error and does not echo raw error text to the client", async () => {
    const originalFetch = global.fetch;
    global.fetch = jest.fn().mockRejectedValueOnce(
      new Error("secret internal detail: connection refused at 10.0.0.5"),
    ) as unknown as typeof fetch;

    const { req, res } = mockReqRes();

    await handleTestAI(req, res);

    expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(500);
    const jsonBody = res.json.mock.calls[0][0];
    expect(jsonBody).toEqual({ data: null, error: "Internal server error" });
    expect(JSON.stringify(jsonBody)).not.toContain("secret internal detail");

    global.fetch = originalFetch;
  });
});
