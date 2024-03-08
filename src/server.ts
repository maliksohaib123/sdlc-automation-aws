import app from "./app";
import http from "http";

const PORT = Number(process.env.PORT) || 80;

const server = http.createServer(app);

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

export default server;
