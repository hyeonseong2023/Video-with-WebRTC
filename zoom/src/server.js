import http from "http";
import WebSocket from "ws";
import SocketIO from "socket.io";
import express from "express";
import { Socket } from "dgram";
import { instrument } from "@socket.io/admin-ui";

const app = express();

app.set("view engine", "pug");
app.set("views", __dirname + "/views");
app.use("/public", express.static(__dirname + "/public"));
app.get("/", (_, res) => res.render("home"));
app.get("/*", (_, res) => res.redirect("/"));

// 같은 서버에서 http, webSocket 둘 다 작동하기 위한 코드
// express를 이용해 http 서버 생성
const httpServer = http.createServer(app);
const wsServer = SocketIO(httpServer);

const handleListen = () => console.log(`Listening on http://localhost:4040`);

httpServer.listen(4040, handleListen)
