const ICE_SERVERS = [{ urls: "stun:stun.l.google.com:19302" }];

export function createP2PSession({
  localUserId,
  remoteUserId,
  initiator,
  sendSignal,
  onDataMessage,
  onStateChange
}) {
  const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
  let dataChannel = null;

  function setState(state) {
    if (onStateChange) onStateChange(state);
  }

  pc.onconnectionstatechange = () => {
    setState(pc.connectionState);
  };

  pc.onicecandidate = async (event) => {
    if (!event.candidate) return;
    await sendSignal({
      sender_id: localUserId,
      recipient_id: remoteUserId,
      message_type: "candidate",
      payload: event.candidate.toJSON()
    });
  };

  function wireDataChannel(channel) {
    dataChannel = channel;
    dataChannel.onopen = () => setState("connected");
    dataChannel.onmessage = (event) => {
      if (onDataMessage) onDataMessage(event.data);
    };
  }

  if (initiator) {
    const channel = pc.createDataChannel("whispers-text");
    wireDataChannel(channel);
  } else {
    pc.ondatachannel = (event) => {
      wireDataChannel(event.channel);
    };
  }

  async function startOffer() {
    if (!initiator) return;
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    await sendSignal({
      sender_id: localUserId,
      recipient_id: remoteUserId,
      message_type: "offer",
      payload: offer
    });
  }

  async function handleSignal(signal) {
    if (signal.message_type === "offer") {
      await pc.setRemoteDescription(new RTCSessionDescription(signal.payload));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      await sendSignal({
        sender_id: localUserId,
        recipient_id: remoteUserId,
        message_type: "answer",
        payload: answer
      });
      return;
    }
    if (signal.message_type === "answer") {
      await pc.setRemoteDescription(new RTCSessionDescription(signal.payload));
      return;
    }
    if (signal.message_type === "candidate") {
      await pc.addIceCandidate(new RTCIceCandidate(signal.payload));
    }
  }

  function sendText(text) {
    if (!dataChannel || dataChannel.readyState !== "open") {
      throw new Error("Peer channel is not connected yet.");
    }
    dataChannel.send(text);
  }

  function destroy() {
    if (dataChannel) dataChannel.close();
    pc.close();
  }

  return { startOffer, handleSignal, sendText, destroy };
}
