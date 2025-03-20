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
  ctx.body = message;
});

app.use(router.routes()).use(router.allowedMethods());

// Запуск сервера
const PORT = process.env.PORT || 7070;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
