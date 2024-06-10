const { createServer } = require("http");
const ws = require("ws");
const { WebSocketServer } = require("ws");
const express = require("express");
const fs = require("node:fs");
const { getRandomInt } = require("./utils");
const dotenv = require("dotenv");
var cors = require("cors");

const app = express();
const httpServer = createServer(app);
const DB_FILE_PATH = "./storage/db.json";

dotenv.config();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

// Posts API > Fetch
app.get("/posts", function (req, res) {
  const data = fs.readFileSync(DB_FILE_PATH, "utf-8");
  const allDataArray = data && data.length > 0 ? JSON.parse(data) : [];

  const total = allDataArray.length;
  const page = parseInt(req.query.page || 1);
  const pageSize = parseInt(req.query.page_size || 10);

  const fromIndex = (page - 1) * pageSize;
  const toIndex = page * pageSize;
  const paginatedData = allDataArray.slice(fromIndex, toIndex);

  if (toIndex >= total && paginatedData.length === 0) {
    res.status(400).json({ message: "All data retrieved" });
    return;
  }

  res.json({
    data: paginatedData,
    total,
    page,
    pageSize,
    nextPage: page + 1,
  });
});

// Posts API > Post
app.post("/posts", function (req, res) {
  const data = fs.readFileSync(DB_FILE_PATH, "utf-8");
  const currentDataArray = data && data.length > 0 ? JSON.parse(data) : [];

  const message = req.body.message;
  if (!message || message.length === 0) {
    res.status(400).json({
      message: "Message is required",
    });
    return;
  }

  const writtenContent = {
    avatar: "./img/avatar.png",
    uname: "User 01",
    message,
    commentNumber: getRandomInt(1000),
    replyNumber: getRandomInt(1000),
    favoriteNumber: getRandomInt(1000),
    timestamp: new Date().toLocaleString(),
  };

  fs.writeFileSync(
    DB_FILE_PATH,
    JSON.stringify([writtenContent, ...currentDataArray])
  );

  res.json({ data: [writtenContent], isCreatedNew: true });
});

// Set up wss
const wss = new WebSocketServer({ server: httpServer }); // (2)
wss.on("connection", (client) => {
  console.log("Client connected !");
  client.on("message", (msg) => {
    broadcast(msg);
  });
});

function broadcast(msg) {
  const parsedMessage = JSON.parse(msg);
  for (const client of wss.clients) {
    if (client.readyState === ws.OPEN) {
      client.send(
        JSON.stringify({
          message: parsedMessage.message,
          timestamp: new Date().toLocaleString(),
        })
      );
    }
  }
}

// Start server
httpServer.listen(process.env.PORT, () => {
  console.log(`Server listening in port ${process.env.PORT}...`);
});
