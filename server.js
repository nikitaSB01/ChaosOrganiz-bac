const http = require("http");
const WebSocket = require("ws");
const Koa = require("koa");
const Router = require("@koa/router");
const koaBody = require("koa-body").default;
const cors = require("@koa/cors");
const { v4: uuidv4 } = require("uuid");

const app = new Koa();
const router = new Router();

app.use(cors());
app.use(koaBody({ multipart: true }));

// Хранилище сообщений в памяти
const messages = [];

// WebSocket-сервер
const server = http.createServer(app.callback());
const wss = new WebSocket.Server({ server });
const clients = new Set();

wss.on("connection", (ws) => {
  clients.add(ws);
  ws.on("close", () => clients.delete(ws));
});

// Функция для рассылки
function broadcastMessage(message) {
  const json = JSON.stringify(message);
  clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(json);
    }
  });
}

// Получение всех сообщений
router.get("/messages", (ctx) => {
  ctx.body = messages;
});

// Отправка нового сообщения
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

app.use(router.routes()).use(router.allowedMethods());

// Запуск сервера
const PORT = process.env.PORT || 7070;
server.listen(PORT, () => {
  console.log(`HTTP + WS server running on http://localhost:${PORT}`);
});
