import "./style.css";
import { initializeApp } from "firebase/app";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries
import {
  getFirestore,
  collection,
  getDoc,
  doc,
  addDoc,
  updateDoc,
  setDoc,
  onSnapshot,
} from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAcpYYsf5UyILe6c_khxD0n0g9xDGO921E",
  authDomain: "webrtc-videochat-1d18c.firebaseapp.com",
  projectId: "webrtc-videochat-1d18c",
  storageBucket: "webrtc-videochat-1d18c.appspot.com",
  messagingSenderId: "552285719892",
  appId: "1:552285719892:web:dadc782f460f1550364cc1",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const servers = {
  iceServers: [
    {
      urls: ["stun:stun1.l.google.com:19302", "stun:stun2.l.google.com:19302"],
    },
  ],
  iceCandidatePoolSize: 10,
};

let pc = new RTCPeerConnection(servers);
let localStream = null;
let remoteStream = null;

const webcamButton = document.getElementById("webcamButton");
const webcamVideo = document.getElementById("webcamVideo");
const callInput = document.getElementById("callInput");
const answerButton = document.getElementById("answerButton");
const remoteVideo = document.getElementById("remoteVideo");
const hangupButton = document.getElementById("hangupButton");

let webcamIsOn = true;

localStream = await navigator.mediaDevices.getUserMedia({
  video: true,
  audio: true, //{'echoCancellation': true}
});
remoteStream = new MediaStream();

localStream.getTracks().forEach((track) => {
  pc.addTrack(track, localStream);
});

pc.ontrack = (event) => {
  event.streams[0].getTracks().forEach((track) => {
    remoteStream.addTrack(track);
  });
};

webcamVideo.srcObject = localStream;
remoteVideo.srcObject = remoteStream;

const callDoc = doc(collection(db, "calls"));
const offerCandidates = collection(db, `calls/${callDoc.id}/offerCandidates`);
const answerCandidates = collection(db, `calls/${callDoc.id}/offerCandidates`);

callInput.value = callDoc.id;

pc.onicecandidate = (event) => {
  event.candidate && addDoc(offerCandidates, event.candidate.toJSON());
};

const offerDescription = await pc.createOffer();
await pc.setLocalDescription(offerDescription);

const offer = {
  sdp: offerDescription.sdp,
  type: offerDescription.type,
};

await setDoc(callDoc, { offer });

onSnapshot(callDoc, (snapshot) => {
  const data = snapshot.data();
  if (!pc.currentRemoteDescription && data?.answer) {
    const answerDescription = new RTCSessionDescription(data.answer);
    pc.setRemoteDescription(answerDescription);
  }
});

onSnapshot(answerCandidates, (snapshot) => {
  snapshot.docChanges().forEach((change) => {
    if (change.type === "added") {
      const candidate = new RTCIceCandidate(change.doc.data());
      pc.addIceCandidate(candidate);
    }
  });
});

hangupButton.disabled = false;

// 1. Setup media sources
webcamButton.onclick = async () => {
  if (webcamIsOn) {
    webcamIconEnabled.style = "display: none";
    webcamIconDisabled.style = "display: inline-block";
    webcamIsOn = false;
  } else {
    answerButton.disabled = false;
    webcamIconEnabled.style = "display: inline-block";
    webcamIconDisabled.style = "display: none";
    webcamIsOn = true;
  }
};

// 3. Answer the call with the unique ID
answerButton.onclick = async () => {
  const callId = callInput.value;
  const callDoc = doc(db, "calls", callId);
  const offerCandidates = collection(db, `calls/${callDoc.id}/offerCandidates`);
  const answerCandidates = collection(
    db,
    `calls/${callDoc.id}/offerCandidates`
  );

  pc.onicecandidate = (event) => {
    event.candidate && addDoc(answerCandidates, event.candidate.toJSON());
  };

  const callData = (await getDoc(callDoc)).data();

  const offerDescription = callData.offer;
  await pc.setRemoteDescription(new RTCSessionDescription(offerDescription));

  const answerDescription = await pc.createAnswer();
  await pc.setLocalDescription(answerDescription);

  const answer = {
    type: answerDescription.type,
    sdp: answerDescription.sdp,
  };

  await updateDoc(callDoc, { answer });

  onSnapshot(offerCandidates, (snapshot) => {
    snapshot.docChanges().forEach((change) => {
      console.log(change);
      if (change.type === "added") {
        let data = change.doc.data();
        pc.addIceCandidate(new RTCIceCandidate(data));
      }
    });
  });
};
