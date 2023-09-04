// 자동적으로 socket.io를 실행하고 있는 
// back-end(server.js)와 연결해주는 function
const socket = io();

const myFace = document.getElementById("myFace")
const muteBtn = document.getElementById("mute")
const cameraBtn = document.getElementById("camera")
const cameraSelect = document.getElementById("cameras")

// stream은 비디오와 오디오의 결합
let myStream;
let muted = false
let cameraOff = false

// 카메라 변경
async function getCameras() {
    try {
        const devices = await navigator.mediaDevices.enumerateDevices()
        const cameras = devices.filter(device => device.kind === "videoinput")
        const currentCamera = myStream.getVideoTracks()[0]
        cameras.forEach(camera => {
            const option = document.createElement("option")
            option.value = camera.deviceId
            option.innerText = camera.label
            // stream의 현재 카메라와 paint 할 때의 카메라 option 가져오기
            // 앱 시작할 때만 실행
            if (currentCamera.label == camera.label) {
                option.selected = true
            }
            cameraSelect.appendChild(option)
        })
    } catch (e) {
        console.log(e);
    }
}

// 웹캠 연결
async function getMedia(deviceId) {
    const initialConstrains = { // deviceId가 없는 초기 카메라
        audio: true,
        video: { facingMode: "user" }
    }
    const cameraConstrainst = { // 선택한 카메라
        audio: true,
        video: { deviceId: { exact: deviceId } }
    }
    try {
        myStream = await navigator.mediaDevices.getUserMedia(
            deviceId ? cameraConstrainst : initialConstrains
        )
        myFace.srcObject = myStream
        if (!deviceId) {
            await getCameras()
        }
        await getCameras()
    } catch (e) {
        console.log(e);
    }
}

getMedia();

// audio on/off
function handleMuteClick() {
    myStream.getAudioTracks().forEach(track => (track.enabled = !track.enabled))
    if (!muted) {
        muteBtn.innerText = "Unmute"
        muted = true
    } else {
        muteBtn.innerText = "Mute"
        muted = false
    }
}

// video on/off
function handleCameraClick() {
    myStream.getVideoTracks().forEach(track => (track.enabled = !track.enabled))
    if (cameraOff) {
        cameraBtn.innerText = "Turn Camera off"
        cameraOff = false
    } else {
        cameraBtn.innerText = "Turn Camera on"
        cameraOff = true
    }
}

// 선택한 카메라로 변경
async function handleCameraChange() {
    await getMedia(cameraSelect.value)
}

muteBtn.addEventListener("click", handleMuteClick)
cameraBtn.addEventListener("click", handleCameraClick)
cameraSelect.addEventListener("input", handleCameraChange)