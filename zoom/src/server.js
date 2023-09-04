import http from "http";
import WebSocket from "ws";
import { Server } from "socket.io";
import express from "express";
import { Socket } from "dgram";
import { instrument } from "@socket.io/admin-ui";

const app = express();

app.set("view engine", "pug");
app.set("views", __dirname + "/views");
app.use("/public", express.static(__dirname + "/public"));
app.get("/", (_, res) => res.render("home"));
app.get("/*", (_, res) => res.redirect("/"));

const handleListen = () => console.log(`Listening on http://localhost:4040`);

// 같은 서버에서 http, webSocket 둘 다 작동하기 위한 코드
// express를 이용해 http 서버 생성
const httpServer = http.createServer(app);
const wsServer = new Server(httpServer, {
    cors: {
        origin: ["https://admin.socket.io"],
        credentials: true
    }
});
instrument(wsServer, {
    auth: false
})

function publicRooms() {
    const { sockets: { adapter: { sids, rooms }, }, } = wsServer
    // const sids = wsServer.sockets.adapter.sids;
    // const rooms = wsServer.sockets.adapter.rooms;

    const publicRooms = [];
    rooms.forEach((_, key) => {
        if (sids.get(key) === undefined) {
            publicRooms.push(key)
        }
    })
    return publicRooms
}

function countRoom(roomName) {
    return wsServer.sockets.adapter.rooms.get(roomName)?.size
}

// ======================================= socketIO 코드
wsServer.on("connection", (socket) => {
    socket["nickname"] = "Anon";
    socket.onAny((event) => {
        console.log(wsServer.sockets.adapter);
        console.log(`Socket Event:${event}`);
    });
    socket.on("enter_room", (roomName, done) => {
        socket.join(roomName);
        // console.log(socket.rooms); // 방 고유 아이디, 방 이름
        // frontend에서 제공한 콜백함수 호출
        // => 서버가 해당 이벤트 처리를 완료했음을 frontend에게 알리는 방법
        // done() 함수는 인자 전달 가능
        done();
        socket.to(roomName).emit("welcome", socket.nickname, countRoom(roomName));
        // server.socket.emit > 모든 socket에 메세지 전송
        wsServer.sockets.emit("room_change", publicRooms())
    })
    socket.on("disconnecting", () => { // 서버연결이 끊기기 전에 이벤트
        socket.rooms.forEach((room) =>
            socket.to(room).emit("bye", socket.nickname, countRoom(room) - 1)
        )
    });
    socket.on("disconnect", () => {
        wsServer.sockets.emit("room_change", publicRooms())
    })
    socket.on("new_message", (msg, room, done) => {
        socket.to(room).emit("new_message", `${socket.nickname}: ${msg}`)
        done();
    })
    socket.on("nickname", (nickname) => (socket["nickname"] = nickname))
})



/* ============================= websocket 코드

// () 안에 server 안 써도 된다함
const wss = new WebSocket.Server({server})

const sockets = [];

// 보낼 땐 send, 받을 땐 on
wss.on("connection", (socket)=>{
    // wss 메서드에 있는게 아닌 socket 메서드 사용해보기
    sockets.push(socket);
    console.log("Connected to Browser"); // 브라우저가 연결될 때
    // 닉네임을 입력하지 않은 익명의 유저 이름 설정
    socket["nickname"] = "Anon";
    socket.on("close", () => console.log("Disconnected from Browser ✖")) // 브라우저가 꺼졌을 때 listener
    socket.on("message", (msg) =>{
        // console.log(message.toString('utf8'), "-utf처리"); // 브라우저가 서버에 메세지를 보냈을 때 listener
        const message = JSON.parse(msg.toString('utf8')) // JSON.parse string을 jsObject로 변환
        // console.log(parsed, " : ", message.toString('utf8')); // 전자는 jsObject, 후자는 string
        
        switch(message.type){
            case "new_message":
                sockets.forEach(aSocket => aSocket.send(`${socket.nickname}: ${message.payload}`));
                break;
            case "nickname":
                socket["nickname"] = message.payload;
                break;
        }
        
        // socket.send(mgs.toString('utf8'));
    });
})

*/

httpServer.listen(4040, handleListen)
