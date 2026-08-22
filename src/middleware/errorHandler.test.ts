import express from "express";
import request from "supertest";
import { errorHandler } from "./errorHandler";

describe("errorHandler", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("returns a JSON error body, not Express's default HTML page, for a synchronous throw", async () => {
    const app = express();
    app.get("/boom", (req, _res) => {
      req.userId = "user-1";
      throw new Error("synchronous failure");
    });
    app.use((_req, res) => {
      res.status(404).json({ data: null, error: "Route not found" });
    });
    app.use(errorHandler);

    const res = await request(app).get("/boom");

    expect(res.status).toBe(500);
    expect(res.type).toBe("application/json");
    expect(res.body).toEqual({ data: null, error: "Internal server error" });
  });

  it("returns a JSON error body for an error passed via next(err)", async () => {
    const app = express();
    app.get("/reject", (req, _res, next) => {
      req.userId = "user-2";
      Promise.reject(new Error("async failure")).catch(next);
    });
    app.use((_req, res) => {
      res.status(404).json({ data: null, error: "Route not found" });
    });
    app.use(errorHandler);

    const res = await request(app).get("/reject");

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ data: null, error: "Internal server error" });
  });

  it("logs the error and request context via console.error before responding", async () => {
    const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    const app = express();
    app.get("/boom", (req, _res) => {
      req.userId = "user-3";
      throw new Error("synchronous failure");
    });
    app.use(errorHandler);

    await request(app).get("/boom");

    expect(consoleErrorSpy).toHaveBeenCalled();
    const loggedArgs = consoleErrorSpy.mock.calls[0].join(" ");
    expect(loggedArgs).toContain("GET");
    expect(loggedArgs).toContain("/boom");
    expect(loggedArgs).toContain("user-3");
  });
});
