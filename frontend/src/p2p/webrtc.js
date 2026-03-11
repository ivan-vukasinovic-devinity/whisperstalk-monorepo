function buildIceServers() {
  // Default public STUN + free OpenRelay TURN for quick testing.
  // For production, replace via VITE_STUN_URL / VITE_TURN_* env vars.
  const stunUrl = import.meta.env.VITE_STUN_URL || "stun:stun.l.google.com:19302";
  const turnUrls =
    import.meta.env.VITE_TURN_URL ||
    "turn:openrelay.metered.ca:80?transport=udp,turn:openrelay.metered.ca:80?transport=tcp,turn:openrelay.metered.ca:443?transport=tcp,turns:openrelay.metered.ca:443?transport=tcp";
  const turnUsername = import.meta.env.VITE_TURN_USERNAME || "openrelayproject";
  const turnCredential = import.meta.env.VITE_TURN_CREDENTIAL || "openrelayproject";

  const servers = [{ urls: stunUrl }];
  if (turnUrls && turnUsername && turnCredential) {
    servers.push({
      urls: turnUrls
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
      username: turnUsername,
      credential: turnCredential
    });
  }
  return servers;
}

const ICE_SERVERS = buildIceServers();

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
    // Only forward non-"connected" states here. "connected" is emitted exclusively
    // from dataChannel.onopen so the App never sees the channel as ready before
    // it can actually send data.
    if (pc.connectionState !== "connected") {
      setState(pc.connectionState);
    }
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
      await pc.setRemoteDescription(signal.payload);
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
      await pc.setRemoteDescription(signal.payload);
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
