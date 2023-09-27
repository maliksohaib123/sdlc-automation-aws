import express, { Request, Response } from "express";

const app = express();

app.get("/", (req: Request, res: Response) => {
  res.sendFile("src/index.html", { root: "." });
});

app.get("/health", (req: Request, res: Response) => {
  res.status(200).json({ status: "UP" });
});

export default app;
