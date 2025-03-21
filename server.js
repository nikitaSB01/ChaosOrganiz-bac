const http = require("http");
const WebSocket = require("ws");
const Koa = require("koa");
const Router = require("@koa/router");
const koaBody = require("koa-body").default;
const cors = require("@koa/cors");
const serve = require("koa-static");
const { v4: uuidv4 } = require("uuid");
const fs = require("fs");
const path = require("path");

const app = new Koa();
const router = new Router();

const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

app.use(cors());
app.use(
  koaBody({
    multipart: true,
    formidable: {
      uploadDir,
      keepExtensions: true,
    },
  })
);
app.use(serve(uploadDir, { index: false }));

const messages = [];

const server = http.createServer(app.callback());
const wss = new WebSocket.Server({ server });
const clients = new Set();

wss.on("connection", (ws) => {
  clients.add(ws);
  ws.on("close", () => clients.delete(ws));
});

function broadcastMessage(message) {
  const json = JSON.stringify(message);
  clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(json);
    }
  });
}

router.get("/messages", (ctx) => {
  ctx.body = messages;
});

router.post("/messages", (ctx) => {
  const { text, type = "text" } = ctx.request.body;

  if (!text) {
    ctx.status = 400;
    ctx.body = { error: "Пустое сообщение" };
    return;
  }

  const message = {
    id: uuidv4(),
    text,
    type,
    date: new Date().toISOString(),
  };

  messages.push(message);
  broadcastMessage(message);
  ctx.body = message;
});

router.post("/upload", async (ctx) => {
  const { file } = ctx.request.files;

  if (!file) {
    ctx.status = 400;
    ctx.body = { error: "Файл не найден" };
    return;
  }

  const originalName = path.basename(file.originalFilename || file.name);
  const newFileName = `${Date.now()}-${originalName}`;
  const newPath = path.join(uploadDir, newFileName);

  fs.renameSync(file.filepath || file.path, newPath); // перемещаем файл

  const fileUrl = `/${newFileName}`;

  const message = {
    id: uuidv4(),
    text: fileUrl,
    type: "file",
    date: new Date().toISOString(),
  };

  messages.push(message);
  broadcastMessage(message);
  ctx.body = message;
});

app.use(router.routes()).use(router.allowedMethods());

const PORT = process.env.PORT || 7070;
server.listen(PORT, () => {
  console.log(`HTTP + WS server running on http://localhost:${PORT}`);
});
