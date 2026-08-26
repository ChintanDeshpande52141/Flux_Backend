import dotenv from "dotenv";
dotenv.config();

import { validateEnv } from "./config/env";
validateEnv();

import app from "./app";

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  // Server started
});
