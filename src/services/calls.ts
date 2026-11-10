export type CallMode = "audio" | "video";
export type CallStatus = "waiting" | "connecting" | "connected";

interface CallCallbacks {
  onStatus: (status: CallStatus) => void;
  onError: (message: string) => void;
  onRemoteStream: (stream: MediaStream | null) => void;
}

interface SignalMessage {
  type: "description" | "candidate";
  description?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
}

async function getIceServers(): Promise<RTCIceServer[]> {
  const response = await fetch("/api/calls/ice-servers", {
    credentials: "same-origin",
    cache: "no-store",
  });
  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const message = payload && typeof payload === "object" && "error" in payload && typeof payload.error === "string"
      ? payload.error
      : "Puhelupalvelimen verkkoyhteysasetuksia ei saatu.";
    throw new Error(message);
  }
  if (!payload || typeof payload !== "object" || !("iceServers" in payload) || !Array.isArray(payload.iceServers)) {
    throw new Error("Puhelupalvelin palautti virheelliset verkkoyhteysasetukset.");
  }
  const iceServers: RTCIceServer[] = [];
  for (const entry of payload.iceServers) {
    if (!entry || typeof entry !== "object" || !("urls" in entry)) {
      throw new Error("Puhelupalvelin palautti virheelliset verkkoyhteysasetukset.");
    }
    const urls = entry.urls;
    if (!(typeof urls === "string" || (Array.isArray(urls) && urls.every((url) => typeof url === "string")))) {
      throw new Error("Puhelupalvelin palautti virheelliset verkkoyhteysasetukset.");
    }
    const server: RTCIceServer = { urls };
    if ("username" in entry && typeof entry.username === "string") server.username = entry.username;
    if ("credential" in entry && typeof entry.credential === "string") server.credential = entry.credential;
    iceServers.push(server);
  }
  if (!iceServers.length) throw new Error("Puhelupalvelin ei määrittänyt yhteyspalvelinta.");
  return iceServers;
}

export class CallSession {
  readonly localStream: MediaStream;
  private readonly socket: WebSocket;
  private readonly peer: RTCPeerConnection;
  private readonly callbacks: CallCallbacks;
  private pendingCandidates: RTCIceCandidateInit[] = [];
  private signalQueue = Promise.resolve();
  private disposed = false;

  private constructor(localStream: MediaStream, callbacks: CallCallbacks, iceServers: RTCIceServer[]) {
    this.localStream = localStream;
    this.callbacks = callbacks;
    this.peer = new RTCPeerConnection({ iceServers });
    for (const track of localStream.getTracks()) this.peer.addTrack(track, localStream);

    this.peer.ontrack = (event) => {
      const stream = event.streams[0] ?? new MediaStream([event.track]);
      callbacks.onRemoteStream(stream);
      callbacks.onStatus("connected");
    };
    this.peer.onconnectionstatechange = () => {
      if (this.peer.connectionState === "connected") callbacks.onStatus("connected");
      if (this.peer.connectionState === "failed") callbacks.onError("Puheluyhteys epäonnistui. Tarkista verkko ja yritä uudelleen.");
    };
    this.socket = new WebSocket(this.getSignalingUrl());
    this.socket.onopen = () => {
      if (!this.disposed) callbacks.onStatus("waiting");
    };
    this.socket.onmessage = (event) => {
      this.signalQueue = this.signalQueue.then(() => this.handleMessage(event.data)).catch((error: unknown) => {
        callbacks.onError(error instanceof Error ? error.message : "Puhelun muodostaminen epäonnistui.");
      });
    };
    this.socket.onerror = () => {
      if (!this.disposed) callbacks.onError("Signalointipalvelimeen ei saatu yhteyttä.");
    };
    this.socket.onclose = () => {
      if (!this.disposed) callbacks.onStatus("waiting");
    };
    this.peer.onicecandidate = (event) => {
      if (event.candidate) this.send({ type: "candidate", candidate: event.candidate.toJSON() });
    };
  }

  static async connect(room: string, mode: CallMode, callbacks: CallCallbacks) {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error("Selain ei tue mikrofonin tai kameran käyttöä. Avaa NEXUS HTTPS-yhteydellä.");
    }
    if (typeof RTCPeerConnection === "undefined") {
      throw new Error("Selain ei tue WebRTC-puheluita.");
    }
    const iceServers = await getIceServers();
    const localStream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: mode === "video" ? { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } } : false,
    });
    let session: CallSession;
    try {
      session = new CallSession(localStream, callbacks, iceServers);
    } catch (error) {
      for (const track of localStream.getTracks()) track.stop();
      throw error;
    }
    session.socket.addEventListener("open", () => {
      if (!session.disposed) session.send({ type: "join", room, mode });
    }, { once: true });
    return session;
  }

  stop() {
    if (this.disposed) return;
    this.disposed = true;
    this.send({ type: "leave" });
    this.socket.onopen = null;
    this.socket.onmessage = null;
    this.socket.onerror = null;
    this.socket.onclose = null;
    this.peer.ontrack = null;
    this.peer.onicecandidate = null;
    this.peer.onconnectionstatechange = null;
    this.peer.close();
    this.socket.close();
    for (const track of this.localStream.getTracks()) track.stop();
  }

  private getSignalingUrl() {
    const configuredUrl = import.meta.env.VITE_CALL_SIGNALING_URL;
    if (configuredUrl) return configuredUrl;
    const protocol = location.protocol === "https:" ? "wss:" : "ws:";
    return `${protocol}//${location.host}/calls`;
  }

  private send(message: object) {
    if (this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(message));
    }
  }

  private async handleMessage(raw: string) {
    if (this.disposed) return;
    let message: Record<string, unknown>;
    try {
      message = JSON.parse(raw) as Record<string, unknown>;
    } catch {
      this.callbacks.onError("Signalointipalvelin lähetti virheellisen viestin.");
      return;
    }
    if (message.type === "waiting") {
      this.callbacks.onStatus("waiting");
    } else if (message.type === "peer-joined") {
      if (message.initiator === true) {
        this.callbacks.onStatus("connecting");
        const offer = await this.peer.createOffer();
        await this.peer.setLocalDescription(offer);
        this.send({ type: "signal", signal: { type: "description", description: this.peer.localDescription } });
      }
    } else if (message.type === "peer-left") {
      this.callbacks.onRemoteStream(null);
      this.callbacks.onStatus("waiting");
      this.callbacks.onError("Toinen osallistuja poistui puhelusta.");
    } else if (message.type === "error") {
      this.callbacks.onError(typeof message.message === "string" ? message.message : "Puhelua ei voitu muodostaa.");
    } else if (message.type === "signal" && message.signal && typeof message.signal === "object") {
      await this.handleSignal(message.signal as SignalMessage);
    }
  }

  private async handleSignal(signal: SignalMessage) {
    if (signal.type === "candidate" && signal.candidate) {
      if (this.peer.remoteDescription) await this.peer.addIceCandidate(signal.candidate);
      else this.pendingCandidates.push(signal.candidate);
      return;
    }
    if (signal.type !== "description" || !signal.description) return;
    await this.peer.setRemoteDescription(signal.description);
    for (const candidate of this.pendingCandidates) await this.peer.addIceCandidate(candidate);
    this.pendingCandidates = [];
    if (signal.description.type === "offer") {
      const answer = await this.peer.createAnswer();
      await this.peer.setLocalDescription(answer);
      this.send({ type: "signal", signal: { type: "description", description: this.peer.localDescription } });
    }
  }
}
