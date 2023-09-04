// 자동적으로 socket.io를 실행하고 있는 
// back-end(server.js)와 연결해주는 function
const socket = io();

const welcome = document.getElementById("welcome")
const form = welcome.querySelector("form")
const room = document.getElementById("room")

room.hidden = true;

let roomName;

function addMessage(message) {
    const ul = room.querySelector("ul")
    const li = document.createElement("li")
    li.innerText = message
    ul.appendChild(li);
}

function handleMessageSubmit(event) {
    event.preventDefault();
    const input = room.querySelector("#msg input")
    const value = input.value
    socket.emit("new_message", input.value, roomName, () => {
        addMessage(`You: ${value}`)
    })
    input.value = ""
}

function handleNicknameSubmit(event) {
    event.preventDefault();
    const input = room.querySelector("#name input")
    socket.emit("nickname", input.value)
}

// 인자를 담아 backend와 주고받을 수 있다
function showRoom() {
    welcome.hidden = true;
    room.hidden = false;
    const h3 = room.querySelector("h3");
    h3.innerText = `Room ${roomName}`
    const msgForm = room.querySelector("#msg")
    const nameForm = room.querySelector("#name")
    msgForm.addEventListener("submit", handleMessageSubmit)
    nameForm.addEventListener("submit", handleNicknameSubmit)
}

function handleRoomSubmit(event) {
    // <form>의 submit 버튼을 클릭하면 폼 데이터가 서버로 전송되며 
    // 페이지가 새로고침되는 현상을 막기 위해 사용
    event.preventDefault();
    const input = form.querySelector("input");
    // 1. event 이름(받을 때 이 이름을 사용), 2. jsObject 전송, 
    // 3. 서버로부터 호출하는 function(콜백함수)
    // 2번째부터 여러 형식과 수의 인자를 보낼 수 있다
    // 다만 콜백함수는 하나만 가능하며 맨 마지막에 와야한다
    // 또한 인자의 순서대로 전달된다
    socket.emit("enter_room", input.value, showRoom)
    roomName = input.value;
    input.value = "";
}

form.addEventListener("submit", handleRoomSubmit);

socket.on("welcome", (user, newCount) => {
    const h3 = room.querySelector("h3");
    h3.innerText = `Room ${roomName} (${newCount})`
    addMessage(`${user} joined!`)
})

socket.on("bye", (left, newCount) => {
    const h3 = room.querySelector("h3");
    h3.innerText = `Room ${roomName} (${newCount})`
    addMessage(`${left} left ㅠㅠ`)
})

socket.on("new_message", addMessage)

socket.on("room_change", (rooms) => {
    const roomList = welcome.querySelector("ul")
    roomList.innerHTML = "";
    if (rooms.length === 0) {
        return;
    }
    rooms.forEach(room => {
        const li = document.createElement("li")
        li.innerText = room
        roomList.append(li)
    })
})
// socket.on("room_change", (msg) => console.log(msg))








/* =================== websocket 수업   

// server.js(back end) 에서의 socket은 연결된 브라우저,
// app.js(front end) 에서의 socket은 서버로의 연결
// window.location.host 는 'localhost:4000'과 같은 형식
const messageList = document.querySelector("ul");
const messageForm = document.querySelector("#message");
const nickForm = document.querySelector("#nick");
const socket = new WebSocket(`ws://${window.location.host}`) // 브라우저를 backend와 연결 

function makeMessage(type, payload){
    const msg = {type, payload}; // object로 만들기
    return JSON.stringify(msg); // JSON.stringify 는 js object를 string으로 변환
}

socket.addEventListener("open", ()=>{
    console.log("Connected to Server ✔");
})

socket.addEventListener("message", (message)=>{
    const li = document.createElement("li");
    li.innerText = message.data;
    messageList.append(li);
})

socket.addEventListener("close", ()=>{
    console.log("Disconnected from Server ✖");
})

function handleSubmit(event){
    event.preventDefault();
    const input = messageForm.querySelector("input");
    socket.send(makeMessage("new_message", input.value)); // 변환된 string 전송
    const li = document.createElement("li");
    li.innerText = `You: ${input.value}`;
    messageList.append(li);
    input.value = "";
}

function handleNickSubmit(event){
    event.preventDefault();
    const input = nickForm.querySelector("input");
    socket.send(makeMessage("nickname", input.value));
    input.value = "";
}

messageForm.addEventListener("submit", handleSubmit);
nickForm.addEventListener("submit", handleNickSubmit);

*/