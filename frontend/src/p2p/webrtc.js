const ICE_SERVERS = [];

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
  const pendingRemoteCandidates = [];

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

  async function flushPendingCandidates() {
    if (!pc.remoteDescription) return;
    while (pendingRemoteCandidates.length > 0) {
      const candidate = pendingRemoteCandidates.shift();
      await pc.addIceCandidate(candidate);
    }
  }

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

  async function startOffer({ iceRestart = false } = {}) {
    if (!initiator) return;
    if (pc.signalingState !== "stable") return;
    const offer = await pc.createOffer({ iceRestart });
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
      if (pc.signalingState !== "stable") {
        try {
          await pc.setLocalDescription({ type: "rollback" });
        } catch (_) {
          // Ignore rollback failures and continue with best effort handling.
        }
      }
      await pc.setRemoteDescription(new RTCSessionDescription(signal.payload));
      await flushPendingCandidates();
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
      await flushPendingCandidates();
      return;
    }
    if (signal.message_type === "candidate") {
      const candidate = new RTCIceCandidate(signal.payload);
      if (!pc.remoteDescription) {
        pendingRemoteCandidates.push(candidate);
        return;
      }
      await pc.addIceCandidate(candidate);
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
