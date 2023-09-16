// 자동적으로 socket.io를 실행하고 있는 
// back-end(server.js)와 연결해주는 function
const socket = io();

const myFace = document.getElementById("myFace");
const muteBtn = document.getElementById("mute");
const cameraBtn = document.getElementById("camera");
const camerasSelect = document.getElementById("cameras");
const call = document.getElementById("call");

call.hidden = true; // 처음 페이지에 오면 캠을 숨김(요청 먼저 받고 공개)

// stream은 비디오와 오디오의 결합
let myStream;
let muted = false;
let cameraOff = false;
let roomName;
let myPeerConnection;
let myDataChannel;

// 카메라 변경
async function getCameras() {
    try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const cameras = devices.filter((device) => device.kind === "videoinput");
        const currentCamera = myStream.getVideoTracks()[0];
        cameras.forEach((camera) => {
            const option = document.createElement("option");
            option.value = camera.deviceId;
            option.innerText = camera.label;
            // stream의 현재 카메라와 paint 할 때의 카메라 option 가져오기
            // 앱 시작할 때만 실행
            if (currentCamera.label === camera.label) {
                option.selected = true;
            }
            camerasSelect.appendChild(option);
        });
    } catch (e) {
        console.log(e);
    }
}

// 웹캠 연결
async function getMedia(deviceId) {
    const initialConstrains = { // deviceId가 없는 초기 카메라
        audio: true,
        video: { facingMode: "user" },
    };
    const cameraConstraints = { // 선택한 카메라
        audio: true,
        video: { deviceId: { exact: deviceId } },
    };
    try {
        myStream = await navigator.mediaDevices.getUserMedia(
            ({ video: true })
            // deviceId ? cameraConstraints : initialConstrains
        );
        myFace.srcObject = myStream;
        if (!deviceId) {
            await getCameras();
        }
    } catch (e) {
        console.log(e);
    }
}

// audio on/off
function handleMuteClick() {
    myStream
        .getAudioTracks()
        .forEach((track) => (track.enabled = !track.enabled));
    if (!muted) {
        muteBtn.innerText = "Unmute";
        muted = true;
    } else {
        muteBtn.innerText = "Mute";
        muted = false;
    }
}

// video on/off
function handleCameraClick() {
    myStream
        .getVideoTracks()
        .forEach((track) => (track.enabled = !track.enabled));
    if (cameraOff) {
        cameraBtn.innerText = "Turn Camera Off";
        cameraOff = false;
    } else {
        cameraBtn.innerText = "Turn Camera On";
        cameraOff = true;
    }
}

// 선택한 카메라로 변경
async function handleCameraChange() {
    await getMedia(camerasSelect.value);
    // sender = peer로 보내진 media stream track을 컨트롤하게 해줌
    if (myPeerConnection) {
        const videoTrack = myStream.getVideoTracks()[0]
        const videoSender = myPeerConnection
            .getSenders()
            .find((sender) => sender.track.kind === "video")
        videoSender.replaceTrack(videoTrack)
    }
}

muteBtn.addEventListener("click", handleMuteClick);
cameraBtn.addEventListener("click", handleCameraClick);
camerasSelect.addEventListener("input", handleCameraChange);


// 하단은 Welcome Form (방 선택 및 입장)
const welcome = document.getElementById("welcome");
const welcomeRoomName = welcome.querySelector("#roomName")
const welcomeNickName = welcome.querySelector("#nickName")
const nicknameContainer = document.querySelector("#userNickname");

// 방에 접속하면 방입력 숨기고, 캠 보이고, 캠 켜기
async function initCall() {
    welcome.hidden = true;
    call.hidden = false;
    await getMedia();
    if (myStream) {
        makeConnection();
    } else {
        console.error("Failed to get media");
    }
}

async function handleWelcomeSubmit(event) {
    event.preventDefault();
    // const input = welcomeRoomName.querySelector("input");
    // roomName = input.value;
    // input.value = "";
    await initCall();
    roomName = welcomeRoomName.value;
    welcomeRoomName.value = "";
    nickname = welcomeNickName.value;
    welcomeNickname.value = "";
    nicknameContainer.innerText = nickname;
    socket.emit("join_room", roomName);
}
welcomeRoomName.addEventListener("submit", handleWelcomeSubmit);

// Socket Code

// 이 부분이 시작점에서 발생하는 코드!!!!**
socket.on("welcome", async () => {
    myDataChannel = myPeerConnection.createDataChannel("chat");
    myDataChannel.addEventListener("message", (event) => console.log(event.data));
    console.log("mada data channel");

    const offer = await myPeerConnection.createOffer();
    myPeerConnection.setLocalDescription(offer);
    console.log("sent the offer");
    socket.emit("offer", offer, roomName); // offer를 상대에게 전송
})

// 들어가는 쪽에서 발생하는 코드!!!!**
socket.on("offer", async (offer) => {
    myPeerConnection.addEventListener("datachannel", (event) => {
        myDataChannel = event.channel;
        myDataChannel.addEventListener("message", (event) =>
            console.log(event.data)
        )
    })
    console.log("received the offer");
    myPeerConnection.setRemoteDescription(offer);
    const answer = await myPeerConnection.createAnswer();
    myPeerConnection.setLocalDescription(answer);
    socket.emit("answer", answer, roomName);
    console.log("sent the answer");
});

socket.on("answer", (answer) => {
    console.log("received the answer");
    myPeerConnection.setRemoteDescription(answer);
});

socket.on("ice", (ice) => {
    console.log("received candidate");
    myPeerConnection.addIceCandidate(ice);
});

// RTC Code
// 연결을 만드는 함수
function makeConnection() { // track들을 개별적으로 추가
    myPeerConnection = new RTCPeerConnection({
        iceServers: [ // 핸드폰과 서버 연결
            {
                urls: [
                    "stun:stun.l.google.com:19302",
                    "stun:stun1.l.google.com:19302",
                    "stun:stun2.l.google.com:19302",
                    "stun:stun3.l.google.com:19302",
                    "stun:stun4.l.google.com:19302",
                ],
            },
        ]
    });
    console.log("stun 서버 연결 확인 : ", myPeerConnection.getConfiguration());

    // ICE 연결 상태 모니터링
    myPeerConnection.addEventListener("iceconnectionstatechange", () => {
        console.log("ICE 연결 상태 : ", myPeerConnection.iceConnectionState);
    });

    // 선택된 ICE 후보 쌍 모니터링 (Chrome only)
    myPeerConnection.addEventListener('icegatheringstatechange', () => {
        if (myPeerConnection.iceGatheringState === 'complete') {
            if (myPeerConnection && myPeerConnection.sctp && myPeerConnection.sctp.transport && myPeerConnection.sctp.transport.iceTransport) {
                const selectedPair = myPeerConnection.sctp.transport.iceTransport.getSelectedCandidatePair();
                console.log("선택된 ICE 후보 쌍");
                console.log("Selected local candidate:", selectedPair.local);
                console.log("Selected remote candidate:", selectedPair.remote);
            } else {
                console.error('Cannot access getSelectedCandidatePair');
            }
        }
    });

    myPeerConnection.addEventListener("icecandidate", handleIce);

    // Deprecated된 addstream 대신 track 이벤트 사용
    myPeerConnection.addEventListener("track", (event) => {
        const peerFace = document.getElementById("peerFace");
        if (peerFace.srcObject !== event.streams[0]) {
            peerFace.srcObject = event.streams[0];
            console.log('Received remote stream');
        }
    });

    // ICE 연결 상태 모니터링
    myPeerConnection.addEventListener("iceconnectionstatechange", () => {
        console.log(myPeerConnection.iceConnectionState);
    });

    myStream.getTracks().forEach((track) =>
        myPeerConnection.addTrack(track, myStream)
    );

    // 양쪽 브라우저에서 카메라와 마이크의 데이터 stream을 받아서 연결 안에 넣기
    // myPeerConnection.addEventListener("addstream", handleAddStream);
    // myStream
    //     .getTracks()
    //     .forEach((track) => myPeerConnection.addTrack(track, myStream));
}

function handleIce(data) { // ice candidate를 받으면 서버로 보내겠다
    console.log("sent candidate");
    socket.emit("ice", data.candidate, roomName);
}

function handleAddStream(data) {
    const peerFace = document.getElementById("peerFace");
    peerFace.srcObject = data.stream;
}