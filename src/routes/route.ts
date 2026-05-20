import type { IncomingMessage, ServerResponse } from "http";

export const routeHandler = (req: IncomingMessage, res: ServerResponse) => {
  if (req.url === "/" && req.method === "GET") {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ message: "root " }));
  } else if (req.url === "/products" && req.method === "GET") {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ message: "products" }));
  } else {
    res.writeHead(404, { "content-type": "application/json" });
    res.end(JSON.stringify({ message: "not found" }));
  }
};
