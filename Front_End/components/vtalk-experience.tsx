"use client";

import type { FormEvent, ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  BookOpen,
  CalendarDays,
  Camera,
  Check,
  ChevronLeft,
  ChevronRight,
  Circle,
  Gauge,
  Hand,
  HeartHandshake,
  Home,
  Search,
  Settings,
  Sparkles,
  UserRound,
  Video,
  X,
} from "lucide-react";

type TransportMode = "websocket" | "rest";
type AuthView = "login" | "register";
type MobileScreen = "home" | "lesson" | "live";
type StatusTone = "idle" | "success" | "warning" | "danger";
type FeedbackRating = "correct" | "incorrect" | "uncertain";

type SettingsConfig = {
  backendUrl: string;
  transportMode: TransportMode;
  frameInterval: number;
  jpegQuality: number;
  mirrorCamera: boolean;
};

type AuthUser = {
  id: number;
  email: string;
  full_name: string;
  is_active: boolean;
  created_at: string;
};

type AuthSession = {
  token: string;
  user: AuthUser;
};

type TranslationResult = {
  translation_id: number;
  request_id: string;
  predicted_text: string;
  confidence: number;
  inference_provider: string;
  source_type: string;
  created_at: string;
};

type StatusChip = {
  tone: StatusTone;
  label: string;
};

const STORAGE_KEYS = {
  config: "vtalk.next.config",
  auth: "vtalk.next.auth",
  transcript: "vtalk.next.transcript",
};

const DEFAULT_CONFIG: SettingsConfig = {
  backendUrl: "http://127.0.0.1:8000",
  transportMode: "websocket",
  frameInterval: 500,
  jpegQuality: 82,
  mirrorCamera: true,
};

const WEEK_TRACKER = [
  { day: "Mon", done: true },
  { day: "Tue", done: false },
  { day: "Wed", done: false },
  { day: "Thu", done: false },
  { day: "Fri", done: false },
  { day: "Sat", done: false },
];

const LESSON_CARDS = [
  { title: "Common Words", accent: "lesson-card--sun", glyph: "ILY" },
  { title: "Alphabet", accent: "lesson-card--coral", glyph: "AZ" },
  { title: "Daily Needs", accent: "lesson-card--mint", glyph: "DAY" },
];

export function VTalkExperience() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const captureTimerRef = useRef<number | null>(null);
  const requestInFlightRef = useRef(false);
  const sessionRunningRef = useRef(false);
  const cameraActiveRef = useRef(false);

  const [config, setConfig] = useState<SettingsConfig>(() =>
    readStorage(STORAGE_KEYS.config, DEFAULT_CONFIG),
  );
  const [auth, setAuth] = useState<AuthSession | null>(() =>
    readStorage<AuthSession | null>(STORAGE_KEYS.auth, null),
  );
  const [authView, setAuthView] = useState<AuthView>("login");
  const [activeScreen, setActiveScreen] = useState<MobileScreen>("home");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isSessionRunning, setIsSessionRunning] = useState(false);
  const [healthStatus, setHealthStatus] = useState<StatusChip>({
    tone: "idle",
    label: "Backend belum dicek",
  });
  const [transportStatus, setTransportStatus] = useState<StatusChip>({
    tone: "idle",
    label: "Transport berhenti",
  });
  const [cameraHint, setCameraHint] = useState(
    "Izinkan akses kamera lalu mulai interpretasi real-time.",
  );
  const [lastTranslation, setLastTranslation] = useState<TranslationResult | null>(null);
  const [history, setHistory] = useState<TranslationResult[]>([]);
  const [transcript, setTranscript] = useState<string[]>(() =>
    readStorage<string[]>(STORAGE_KEYS.transcript, []),
  );
  const [feedbackNote, setFeedbackNote] = useState("");
  const [authForm, setAuthForm] = useState({
    fullName: "",
    email: "",
    password: "",
  });
  const [isMobileViewport, setIsMobileViewport] = useState(false);

  useEffect(() => {
    writeStorage(STORAGE_KEYS.config, config);
  }, [config]);

  useEffect(() => {
    writeStorage(STORAGE_KEYS.transcript, transcript);
  }, [transcript]);

  useEffect(() => {
    if (auth) {
      writeStorage(STORAGE_KEYS.auth, auth);
    } else if (typeof window !== "undefined") {
      window.localStorage.removeItem(STORAGE_KEYS.auth);
    }
  }, [auth]);

  useEffect(() => {
    sessionRunningRef.current = isSessionRunning;
  }, [isSessionRunning]);

  useEffect(() => {
    cameraActiveRef.current = isCameraActive;
  }, [isCameraActive]);

  useEffect(() => {
    void checkBackendHealth();
    return () => {
      stopSession("Sesi dihentikan.");
      stopCameraTracks();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mediaQuery = window.matchMedia("(max-width: 980px)");
    const updateViewport = () => setIsMobileViewport(mediaQuery.matches);
    updateViewport();
    mediaQuery.addEventListener("change", updateViewport);
    return () => mediaQuery.removeEventListener("change", updateViewport);
  }, []);

  const confidencePercent = useMemo(
    () => Math.round((lastTranslation?.confidence ?? 0) * 100),
    [lastTranslation],
  );

  const currentModeLabel = config.transportMode === "websocket" ? "WebSocket" : "REST";
  const isFeedbackReady = Boolean(lastTranslation?.translation_id);

  async function checkBackendHealth() {
    setHealthStatus({ tone: "warning", label: "Memeriksa backend..." });
    try {
      const response = await fetch(`${normalizeBaseUrl(config.backendUrl)}/api/v1/health`);
      if (!response.ok) {
        throw new Error(`Health check gagal (${response.status})`);
      }
      const payload = await response.json();
      const provider = payload?.data?.inference_provider ?? "unknown";
      setHealthStatus({ tone: "success", label: `Backend aktif | ${provider}` });
      return true;
    } catch (error) {
      setHealthStatus({ tone: "danger", label: getErrorMessage(error) });
      return false;
    }
  }

  async function startCamera() {
    if (isCameraActive) return;
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("Browser tidak mendukung akses kamera.");
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 1080 },
          height: { ideal: 1440 },
        },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setIsCameraActive(true);
      setCameraHint("Kamera aktif. Mulai sesi interpretasi saat siap.");
      setActiveScreen("live");
    } catch (error) {
      setCameraHint(getErrorMessage(error));
    }
  }

  function stopCameraTracks() {
    if (streamRef.current) {
      for (const track of streamRef.current.getTracks()) {
        track.stop();
      }
    }
    streamRef.current = null;
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }

  function stopCamera() {
    stopSession("Kamera dimatikan.");
    stopCameraTracks();
    setIsCameraActive(false);
    setCameraHint("Kamera dimatikan.");
  }

  async function startSession() {
    if (!isCameraActive) {
      setCameraHint("Aktifkan kamera terlebih dahulu.");
      return;
    }

    const isHealthy = await checkBackendHealth();
    if (!isHealthy) {
      setCameraHint("Backend belum siap. Periksa alamat backend lalu coba lagi.");
      return;
    }

    setIsSessionRunning(true);
    setActiveScreen("live");
    setTransportStatus({
      tone: "warning",
      label:
        config.transportMode === "websocket"
          ? "Menyambungkan WebSocket..."
          : "Menyiapkan REST...",
    });

    if (config.transportMode === "websocket") {
      startWebSocketSession();
    } else {
      startRestSession();
    }
  }

  function stopSession(message = "Sesi dihentikan.") {
    setIsSessionRunning(false);
    requestInFlightRef.current = false;
    if (captureTimerRef.current) {
      window.clearInterval(captureTimerRef.current);
      captureTimerRef.current = null;
    }
    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
    }
    setTransportStatus({ tone: "idle", label: "Transport berhenti" });
    setCameraHint(message);
  }

  function startWebSocketSession() {
    try {
      const socket = new WebSocket(buildWebSocketUrl(config.backendUrl));
      socketRef.current = socket;

      socket.addEventListener("open", () => {
        setTransportStatus({ tone: "success", label: "WebSocket aktif" });
        setCameraHint("Interpretasi real-time berjalan lewat WebSocket.");
        const firstFrame = captureFrame();
        if (firstFrame) {
          socket.send(
            JSON.stringify({
              frame_data: firstFrame,
              source_type: "video_frame",
            }),
          );
        }
        beginCaptureLoop((frameData) => {
          if (socket.readyState === WebSocket.OPEN) {
            socket.send(
              JSON.stringify({
                frame_data: frameData,
                source_type: "video_frame",
              }),
            );
          }
        });
      });

      socket.addEventListener("message", (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload?.data?.predicted_text) {
            processTranslation(payload.data as TranslationResult);
          }
        } catch {
          setTransportStatus({ tone: "danger", label: "Payload WS tidak valid" });
        }
      });

      socket.addEventListener("close", () => {
        if (sessionRunningRef.current) {
          setTransportStatus({ tone: "danger", label: "WebSocket terputus" });
          setCameraHint("Koneksi WebSocket terputus.");
          setIsSessionRunning(false);
        }
      });

      socket.addEventListener("error", () => {
        setTransportStatus({ tone: "danger", label: "WebSocket error" });
        setCameraHint("Gagal terhubung ke WebSocket backend.");
      });
    } catch (error) {
      setTransportStatus({ tone: "danger", label: "WebSocket gagal" });
      setCameraHint(getErrorMessage(error));
      setIsSessionRunning(false);
    }
  }

  function startRestSession() {
    setTransportStatus({ tone: "success", label: "REST aktif" });
    setCameraHint("Interpretasi real-time berjalan lewat REST.");

    const sendFrame = async (frameData: string) => {
      if (requestInFlightRef.current) return;
      requestInFlightRef.current = true;
      try {
        const response = await fetch(
          `${normalizeBaseUrl(config.backendUrl)}/api/v1/translations/predict`,
          {
            method: "POST",
            headers: buildJsonHeaders(auth?.token),
            body: JSON.stringify({
              frame_data: frameData,
              source_type: "video_frame",
            }),
          },
        );
        const payload = await response.json();
        if (!response.ok || !payload.success) {
          throw new Error(payload?.message || `Request gagal (${response.status})`);
        }
        processTranslation(payload.data as TranslationResult);
      } catch (error) {
        setTransportStatus({ tone: "danger", label: getErrorMessage(error) });
      } finally {
        requestInFlightRef.current = false;
      }
    };

    const firstFrame = captureFrame();
    if (firstFrame) {
      void sendFrame(firstFrame);
    }
    beginCaptureLoop(sendFrame);
  }

  function beginCaptureLoop(sendFrame: (frameData: string) => void | Promise<void>) {
    if (captureTimerRef.current) {
      window.clearInterval(captureTimerRef.current);
    }

    captureTimerRef.current = window.setInterval(() => {
      if (!sessionRunningRef.current || !cameraActiveRef.current) return;
      const frameData = captureFrame();
      if (frameData) {
        void sendFrame(frameData);
      }
    }, config.frameInterval);
  }

  function captureFrame() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !video.videoWidth || !video.videoHeight) {
      return null;
    }
    const context = canvas.getContext("2d");
    if (!context) return null;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", config.jpegQuality / 100);
  }

  function processTranslation(result: TranslationResult) {
    setLastTranslation(result);
    setHistory((prev) => [result, ...prev].slice(0, 6));
    setTranscript((prev) => {
      const lastLetter = prev[prev.length - 1];
      if (lastLetter === result.predicted_text) return prev;
      return [...prev, result.predicted_text].slice(-24);
    });
  }

  async function submitFeedback(rating: FeedbackRating) {
    if (!lastTranslation?.translation_id) return;
    try {
      const response = await fetch(`${normalizeBaseUrl(config.backendUrl)}/api/v1/feedback`, {
        method: "POST",
        headers: buildJsonHeaders(auth?.token),
        body: JSON.stringify({
          translation_id: lastTranslation.translation_id,
          rating,
          note: feedbackNote.trim(),
        }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) {
        throw new Error(payload?.message || `Feedback gagal (${response.status})`);
      }
      setFeedbackNote("");
      setTransportStatus({ tone: "success", label: "Feedback terkirim" });
    } catch (error) {
      setTransportStatus({ tone: "danger", label: getErrorMessage(error) });
    }
  }

  async function submitAuthForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      const endpoint =
        authView === "register" ? "/api/v1/auth/register" : "/api/v1/auth/login";
      const payload =
        authView === "register"
          ? {
              email: authForm.email,
              password: authForm.password,
              full_name: authForm.fullName,
            }
          : {
              email: authForm.email,
              password: authForm.password,
            };

      const response = await fetch(`${normalizeBaseUrl(config.backendUrl)}${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data?.message || `Autentikasi gagal (${response.status})`);
      }

      if (authView === "register") {
        setAuthView("login");
        setTransportStatus({ tone: "success", label: "Registrasi berhasil" });
        return;
      }

      setAuth({
        token: data.data.access_token as string,
        user: data.data.user as AuthUser,
      });
      setAuthForm({ fullName: "", email: "", password: "" });
      setIsAuthOpen(false);
      setTransportStatus({ tone: "success", label: "Login berhasil" });
    } catch (error) {
      setTransportStatus({ tone: "danger", label: getErrorMessage(error) });
    }
  }

  function clearSessionData() {
    setHistory([]);
    setTranscript([]);
    setLastTranslation(null);
  }

  function updateConfig<K extends keyof SettingsConfig>(key: K, value: SettingsConfig[K]) {
    if (isSessionRunning) {
      stopSession("Pengaturan berubah. Mulai ulang sesi untuk menerapkan perubahan.");
    }
    setConfig((prev) => ({ ...prev, [key]: value }));
  }

  function logout() {
    setAuth(null);
    setTransportStatus({ tone: "idle", label: "Guest mode aktif" });
  }

  const homePhone = (
    <PhoneFrame
      title="Home"
      className={`phone phone--left ${activeScreen === "home" ? "phone--focused" : ""}`}
    >
      <div className="app-topbar">
        <div>
          <p className="welcome-title">Hi, Peach!</p>
          <p className="welcome-subtitle">Vision Talk | Bahasa Isyarat Indonesia</p>
        </div>
        <button className="icon-bubble" type="button" onClick={() => setIsAuthOpen(true)}>
          <Search size={15} />
        </button>
      </div>

      <section className="mini-section">
        <div className="section-row">
          <h3>Continue Lessons</h3>
          <button className="link-button" type="button" onClick={() => setActiveScreen("lesson")}>
            See all
          </button>
        </div>
        <button className="lesson-progress-card" type="button" onClick={() => setActiveScreen("lesson")}>
          <div className="lesson-progress-content">
            <span className="lesson-icon">ILY</span>
            <div>
              <strong>Common Words</strong>
              <p>Materi ekspresi dasar untuk komunikasi sehari-hari.</p>
            </div>
          </div>
          <div className="progress-ring">
            <span>75%</span>
            <small>complete</small>
          </div>
        </button>
      </section>

      <section className="mini-section">
        <div className="section-row">
          <h3>Daily Tracker</h3>
          <button className="link-button" type="button">
            <CalendarDays size={14} />
            Calendar
          </button>
        </div>
        <div className="tracker-grid">
          {WEEK_TRACKER.map((item) => (
            <div key={item.day} className={`tracker-cell ${item.done ? "tracker-cell--done" : ""}`}>
              <span>{item.day}</span>
              {item.done ? <Check size={12} /> : <Circle size={10} />}
            </div>
          ))}
        </div>
      </section>

      <section className="mini-section">
        <div className="sign-day">
          <div>
            <span className="card-label">Sign of the Day</span>
            <strong>Terima kasih</strong>
          </div>
          <span className="sign-gesture">SIGN</span>
        </div>
      </section>

      <section className="lesson-grid">
        {LESSON_CARDS.map((card) => (
          <button
            key={card.title}
            type="button"
            className={`lesson-card ${card.accent}`}
            onClick={() => setActiveScreen(card.title === "Common Words" ? "lesson" : "home")}
          >
            <span className="lesson-card-glyph">{card.glyph}</span>
            <strong>{card.title}</strong>
          </button>
        ))}
      </section>

      <PhoneNav active={activeScreen} onChange={setActiveScreen} onSettings={() => setIsSettingsOpen(true)} />
    </PhoneFrame>
  );

  const lessonPhone = (
    <PhoneFrame
      title="Lesson"
      className={`phone phone--center ${activeScreen === "lesson" ? "phone--focused" : ""}`}
    >
      <div className="top-icon-row">
        <button className="icon-bubble" type="button" onClick={() => setActiveScreen("home")}>
          <ChevronLeft size={15} />
        </button>
        <div className="top-icon-actions">
          <button className="icon-bubble" type="button" onClick={() => setIsAuthOpen(true)}>
            <UserRound size={15} />
          </button>
          <button className="icon-bubble" type="button" onClick={() => setIsSettingsOpen(true)}>
            <Settings size={15} />
          </button>
        </div>
      </div>

      <div className="lesson-hero">
        <div className="hero-corners" aria-hidden="true">
          <span />
          <span />
        </div>
        <div className="lesson-hero-text">
          <span>{healthStatus.label}</span>
          <strong>{auth?.user.full_name ?? "Guest Session"}</strong>
        </div>
      </div>

      <section className="feature-card">
        <div className="feature-card-head">
          <span className="card-label">Common Words</span>
          <span className={`status-dot status-dot--${healthStatus.tone}`} />
        </div>
        <div className="feature-sign">ILY</div>
        <h3>I Love You</h3>
        <p>
          Latihan isyarat harian untuk komunikasi yang inklusif dan mudah dipahami.
        </p>
      </section>

      <div className="pager-row">
        <button className="icon-bubble icon-bubble--flat" type="button">
          <ChevronLeft size={15} />
        </button>
        <button className="icon-bubble icon-bubble--flat" type="button" onClick={() => setActiveScreen("live")}>
          <ChevronRight size={15} />
        </button>
      </div>

      <section className="info-stack">
        <div className="info-pill">
          <Sparkles size={15} />
          <span>Realtime AI Translation</span>
        </div>
        <div className="info-pill">
          <Gauge size={15} />
          <span>{transportStatus.label}</span>
        </div>
        <button className="action-strip" type="button" onClick={() => setActiveScreen("live")}>
          <div>
            <strong>Open Interpreter</strong>
            <span>Masuk ke layar kamera real-time yang terhubung ke backend.</span>
          </div>
          <ArrowLeft size={16} className="rotated-arrow" />
        </button>
      </section>

      <PhoneNav active={activeScreen} onChange={setActiveScreen} onSettings={() => setIsSettingsOpen(true)} />
    </PhoneFrame>
  );

  const livePhone = (
    <PhoneFrame
      title="Interpreter"
      className={`phone phone--right ${activeScreen === "live" ? "phone--focused" : ""}`}
    >
      <div className="top-icon-row">
        <button className="icon-bubble" type="button" onClick={() => setActiveScreen("lesson")}>
          <ChevronLeft size={15} />
        </button>
        <div className="top-icon-actions">
          <button className="icon-bubble" type="button" onClick={isCameraActive ? stopCamera : startCamera}>
            {isCameraActive ? <Video size={15} /> : <Camera size={15} />}
          </button>
        </div>
      </div>

      <div className="camera-shell">
        <div className="camera-visual">
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className={config.mirrorCamera ? "camera-video camera-video--mirror" : "camera-video"}
          />
          <canvas ref={canvasRef} className="hidden-canvas" />
          <div className="camera-fallback" aria-hidden="true" />
          <div className="camera-corners" aria-hidden="true">
            <span />
            <span />
            <span />
            <span />
          </div>
        </div>

        <div className="interpreter-sheet">
          <span className="card-label">Interpreting</span>
          <strong className="live-letter">{lastTranslation?.predicted_text ?? "F"}</strong>
          <p className="live-helper">{cameraHint}</p>
          <div className="confidence-strip">
            <span>Confidence</span>
            <strong>{confidencePercent}%</strong>
          </div>
          <div className="confidence-bar">
            <div
              className="confidence-bar-fill"
              style={{ width: `${confidencePercent}%` }}
            />
          </div>
          <div className="live-action-row">
            <button className="pill-button pill-button--primary" type="button" onClick={startCamera}>
              Start Camera
            </button>
            <button
              className="pill-button"
              type="button"
              onClick={isSessionRunning ? () => stopSession("Sesi dihentikan.") : startSession}
            >
              {isSessionRunning ? "Stop" : "Translate"}
            </button>
          </div>
          <div className="live-meta">
            <span>{currentModeLabel}</span>
            <span>{lastTranslation?.request_id ?? "No request yet"}</span>
          </div>
        </div>
      </div>

      <section className="feedback-card">
        <div className="section-row">
          <h3>Transcript</h3>
          <button className="link-button" type="button" onClick={clearSessionData}>
            Clear
          </button>
        </div>
        <p className="transcript-line">
          {transcript.length ? transcript.join(" ") : "Belum ada hasil translasi."}
        </p>
        <textarea
          value={feedbackNote}
          onChange={(event) => setFeedbackNote(event.target.value)}
          placeholder="Tambahkan catatan singkat untuk feedback."
          className="feedback-textarea"
        />
        <div className="feedback-actions">
          <button
            className="tag-button"
            type="button"
            disabled={!isFeedbackReady}
            onClick={() => void submitFeedback("correct")}
          >
            Akurat
          </button>
          <button
            className="tag-button"
            type="button"
            disabled={!isFeedbackReady}
            onClick={() => void submitFeedback("incorrect")}
          >
            Koreksi
          </button>
          <button
            className="tag-button"
            type="button"
            disabled={!isFeedbackReady}
            onClick={() => void submitFeedback("uncertain")}
          >
            Belum yakin
          </button>
        </div>
        <div className="history-stack">
          {history.length ? (
            history.map((entry) => (
              <div key={entry.request_id} className="history-item">
                <strong>{entry.predicted_text}</strong>
                <span>{Math.round(entry.confidence * 100)}%</span>
                <span>{formatTime(entry.created_at)}</span>
              </div>
            ))
          ) : (
            <div className="history-empty">Riwayat prediksi akan muncul di sini.</div>
          )}
        </div>
      </section>

      <PhoneNav active={activeScreen} onChange={setActiveScreen} onSettings={() => setIsSettingsOpen(true)} />
    </PhoneFrame>
  );

  return (
    <main className="vtalk-page">
      <section className="scene-shell">
        <div className="scene-copy">
          <div>
            <span className="scene-badge">CC26-PSU145 | Inclusive & Resilient Communities</span>
            <h1>V-Talk</h1>
            <p>
              Antarmuka Next.js untuk penerjemah bahasa isyarat real-time yang menghubungkan
              pengalaman belajar, sesi interpretasi, dan integrasi backend AI dalam satu alur.
            </p>
          </div>

          <div className="scene-status">
            <StatusPill status={healthStatus} />
            <StatusPill status={transportStatus} />
            <button className="ghost-action" type="button" onClick={() => void checkBackendHealth()}>
              Cek Backend
            </button>
          </div>
        </div>

        {!isMobileViewport ? (
          <div className="desktop-workspace">
            <section className="desktop-hero">
              <div className="desktop-hero-copy">
                <span className="card-label">Realtime Sign Language Platform</span>
                <h2>Belajar, memantau, dan menerjemahkan bahasa isyarat dalam satu workspace desktop.</h2>
                <p>
                  Tampilan desktop ini menyatukan lesson progress, status backend, sesi kamera real-time,
                  transcript, dan feedback agar lebih nyaman dipakai untuk demo, evaluasi, dan integrasi.
                </p>
                <div className="desktop-hero-actions">
                  <button className="desktop-primary" type="button" onClick={startCamera}>
                    {isCameraActive ? "Kamera Aktif" : "Mulai Kamera"}
                  </button>
                  <button
                    className="desktop-secondary"
                    type="button"
                    onClick={isSessionRunning ? () => stopSession("Sesi dihentikan.") : startSession}
                  >
                    {isSessionRunning ? "Hentikan Translasi" : "Mulai Translasi"}
                  </button>
                  <button className="desktop-secondary" type="button" onClick={() => setIsSettingsOpen(true)}>
                    Pengaturan
                  </button>
                </div>
              </div>

              <div className="desktop-hero-side">
                <div className="desktop-quick-card desktop-quick-card--lesson">
                  <div className="desktop-quick-head">
                    <span className="card-label">Continue Lessons</span>
                    <span className="desktop-chip">75%</span>
                  </div>
                  <div className="desktop-lesson-icon">ILY</div>
                  <strong>Common Words</strong>
                  <p>Latihan ekspresi dasar untuk komunikasi harian yang inklusif.</p>
                </div>

                <div className="desktop-quick-card desktop-quick-card--status">
                  <div className="desktop-status-list">
                    <StatusPill status={healthStatus} />
                    <StatusPill status={transportStatus} />
                  </div>
                  <div className="desktop-auth-inline">
                    <strong>{auth?.user.full_name ?? "Guest Mode"}</strong>
                    <span>{auth?.user.email ?? "Login opsional untuk sesi pengguna"}</span>
                  </div>
                  <button
                    className="ghost-action ghost-action--dark"
                    type="button"
                    onClick={() => setIsAuthOpen(true)}
                  >
                    {auth ? "Kelola Session" : "Login / Register"}
                  </button>
                </div>
              </div>
            </section>

            <section className="desktop-grid">
              <article className="desktop-panel desktop-panel--camera">
                <div className="desktop-panel-head">
                  <div>
                    <span className="card-label">Interpreter</span>
                    <h3>Live Camera Translation</h3>
                  </div>
                  <div className="desktop-head-actions">
                    <button
                      className="icon-bubble"
                      type="button"
                      onClick={isCameraActive ? stopCamera : startCamera}
                    >
                      {isCameraActive ? <Video size={15} /> : <Camera size={15} />}
                    </button>
                    <button className="icon-bubble" type="button" onClick={() => setIsSettingsOpen(true)}>
                      <Settings size={15} />
                    </button>
                  </div>
                </div>

                <div className="desktop-camera-shell">
                  <div className="desktop-camera-stage">
                    <video
                      ref={videoRef}
                      autoPlay
                      muted
                      playsInline
                      className={config.mirrorCamera ? "camera-video camera-video--mirror" : "camera-video"}
                    />
                    <canvas ref={canvasRef} className="hidden-canvas" />
                    <div className="camera-fallback" aria-hidden="true" />
                    <div className="camera-corners" aria-hidden="true">
                      <span />
                      <span />
                    </div>
                  </div>

                  <div className="desktop-camera-insight">
                    <div className="desktop-metric">
                      <span className="card-label">Interpreting</span>
                      <strong>{lastTranslation?.predicted_text ?? "-"}</strong>
                      <p>{cameraHint}</p>
                    </div>
                    <div className="desktop-metric">
                      <span className="card-label">Confidence</span>
                      <strong>{confidencePercent}%</strong>
                      <div className="confidence-bar">
                        <div className="confidence-bar-fill" style={{ width: `${confidencePercent}%` }} />
                      </div>
                    </div>
                    <div className="desktop-inline-meta">
                      <span>{currentModeLabel}</span>
                      <span>{lastTranslation?.request_id ?? "Belum ada request"}</span>
                    </div>
                  </div>
                </div>
              </article>

              <article className="desktop-panel desktop-panel--sidebar">
                <div className="desktop-panel-head">
                  <div>
                    <span className="card-label">Session Controls</span>
                    <h3>Workspace Settings</h3>
                  </div>
                </div>

                <div className="desktop-controls">
                  <div className="desktop-field">
                    <span>Backend URL</span>
                    <input
                      value={config.backendUrl}
                      onChange={(event) => updateConfig("backendUrl", event.target.value)}
                      placeholder="http://127.0.0.1:8000"
                    />
                  </div>

                  <div className="desktop-field">
                    <span>Mode Transport</span>
                    <div className="segmented">
                      <button
                        type="button"
                        className={config.transportMode === "websocket" ? "segmented--active" : ""}
                        onClick={() => updateConfig("transportMode", "websocket")}
                      >
                        WebSocket
                      </button>
                      <button
                        type="button"
                        className={config.transportMode === "rest" ? "segmented--active" : ""}
                        onClick={() => updateConfig("transportMode", "rest")}
                      >
                        REST
                      </button>
                    </div>
                  </div>

                  <div className="desktop-field">
                    <span>Interval Frame ({config.frameInterval} ms)</span>
                    <input
                      type="range"
                      min={300}
                      max={1200}
                      step={50}
                      value={config.frameInterval}
                      onChange={(event) => updateConfig("frameInterval", Number(event.target.value))}
                    />
                  </div>

                  <div className="desktop-field">
                    <span>Kualitas JPEG ({config.jpegQuality}%)</span>
                    <input
                      type="range"
                      min={50}
                      max={95}
                      step={1}
                      value={config.jpegQuality}
                      onChange={(event) => updateConfig("jpegQuality", Number(event.target.value))}
                    />
                  </div>

                  <label className="check-row">
                    <input
                      type="checkbox"
                      checked={config.mirrorCamera}
                      onChange={(event) => updateConfig("mirrorCamera", event.target.checked)}
                    />
                    <span>Mirror preview kamera</span>
                  </label>
                </div>
              </article>

              <article className="desktop-panel desktop-panel--lessons">
                <div className="desktop-panel-head">
                  <div>
                    <span className="card-label">Daily Learning</span>
                    <h3>Tracker & Lesson Cards</h3>
                  </div>
                </div>

                <div className="tracker-grid tracker-grid--desktop">
                  {WEEK_TRACKER.map((item) => (
                    <div key={item.day} className={`tracker-cell ${item.done ? "tracker-cell--done" : ""}`}>
                      <span>{item.day}</span>
                      {item.done ? <Check size={12} /> : <Circle size={10} />}
                    </div>
                  ))}
                </div>

                <div className="desktop-lesson-grid">
                  {LESSON_CARDS.map((card) => (
                    <button key={card.title} type="button" className={`lesson-card ${card.accent}`}>
                      <span className="lesson-card-glyph">{card.glyph}</span>
                      <strong>{card.title}</strong>
                    </button>
                  ))}
                </div>
              </article>

              <article className="desktop-panel desktop-panel--transcript">
                <div className="desktop-panel-head">
                  <div>
                    <span className="card-label">History & Feedback</span>
                    <h3>Transcript Session</h3>
                  </div>
                  <button className="link-button" type="button" onClick={clearSessionData}>
                    Clear
                  </button>
                </div>

                <div className="desktop-transcript">
                  {transcript.length ? transcript.join(" ") : "Belum ada hasil translasi."}
                </div>

                <textarea
                  value={feedbackNote}
                  onChange={(event) => setFeedbackNote(event.target.value)}
                  placeholder="Tambahkan catatan singkat untuk feedback."
                  className="feedback-textarea"
                />

                <div className="feedback-actions">
                  <button
                    className="tag-button"
                    type="button"
                    disabled={!isFeedbackReady}
                    onClick={() => void submitFeedback("correct")}
                  >
                    Akurat
                  </button>
                  <button
                    className="tag-button"
                    type="button"
                    disabled={!isFeedbackReady}
                    onClick={() => void submitFeedback("incorrect")}
                  >
                    Koreksi
                  </button>
                  <button
                    className="tag-button"
                    type="button"
                    disabled={!isFeedbackReady}
                    onClick={() => void submitFeedback("uncertain")}
                  >
                    Belum yakin
                  </button>
                </div>

                <div className="desktop-history-list">
                  {history.length ? (
                    history.map((entry) => (
                      <div key={entry.request_id} className="history-item">
                        <strong>{entry.predicted_text}</strong>
                        <span>{Math.round(entry.confidence * 100)}%</span>
                        <span>{formatTime(entry.created_at)}</span>
                      </div>
                    ))
                  ) : (
                    <div className="history-empty">Riwayat prediksi akan muncul di sini.</div>
                  )}
                </div>
              </article>
            </section>
          </div>
        ) : (
          <div className="phone-showcase phone-showcase--mobile">
            {activeScreen === "home" && homePhone}
            {activeScreen === "lesson" && lessonPhone}
            {activeScreen === "live" && livePhone}
          </div>
        )}
      </section>

      {isSettingsOpen && (
        <Modal title="Pengaturan Sesi" onClose={() => setIsSettingsOpen(false)}>
          <div className="modal-stack">
            <label className="field-block">
              <span>Backend URL</span>
              <input
                value={config.backendUrl}
                onChange={(event) => updateConfig("backendUrl", event.target.value)}
                placeholder="http://127.0.0.1:8000"
              />
            </label>

            <div className="field-block">
              <span>Mode Transport</span>
              <div className="segmented">
                <button
                  type="button"
                  className={config.transportMode === "websocket" ? "segmented--active" : ""}
                  onClick={() => updateConfig("transportMode", "websocket")}
                >
                  WebSocket
                </button>
                <button
                  type="button"
                  className={config.transportMode === "rest" ? "segmented--active" : ""}
                  onClick={() => updateConfig("transportMode", "rest")}
                >
                  REST
                </button>
              </div>
            </div>

            <label className="field-block">
              <span>Interval Frame ({config.frameInterval} ms)</span>
              <input
                type="range"
                min={300}
                max={1200}
                step={50}
                value={config.frameInterval}
                onChange={(event) => updateConfig("frameInterval", Number(event.target.value))}
              />
            </label>

            <label className="field-block">
              <span>Kualitas JPEG ({config.jpegQuality}%)</span>
              <input
                type="range"
                min={50}
                max={95}
                step={1}
                value={config.jpegQuality}
                onChange={(event) => updateConfig("jpegQuality", Number(event.target.value))}
              />
            </label>

            <label className="check-row">
              <input
                type="checkbox"
                checked={config.mirrorCamera}
                onChange={(event) => updateConfig("mirrorCamera", event.target.checked)}
              />
              <span>Mirror preview kamera</span>
            </label>

            <StatusPill status={healthStatus} />
          </div>
        </Modal>
      )}

      {isAuthOpen && (
        <Modal title={authView === "login" ? "Login Session" : "Register Session"} onClose={() => setIsAuthOpen(false)}>
          <div className="modal-stack">
            <div className="segmented">
              <button
                type="button"
                className={authView === "login" ? "segmented--active" : ""}
                onClick={() => setAuthView("login")}
              >
                Login
              </button>
              <button
                type="button"
                className={authView === "register" ? "segmented--active" : ""}
                onClick={() => setAuthView("register")}
              >
                Register
              </button>
            </div>

            <form className="modal-stack" onSubmit={submitAuthForm}>
              {authView === "register" && (
                <label className="field-block">
                  <span>Nama Lengkap</span>
                  <input
                    value={authForm.fullName}
                    onChange={(event) =>
                      setAuthForm((prev) => ({ ...prev, fullName: event.target.value }))
                    }
                    required
                  />
                </label>
              )}

              <label className="field-block">
                <span>Email</span>
                <input
                  type="email"
                  value={authForm.email}
                  onChange={(event) =>
                    setAuthForm((prev) => ({ ...prev, email: event.target.value }))
                  }
                  required
                />
              </label>

              <label className="field-block">
                <span>Password</span>
                <input
                  type="password"
                  value={authForm.password}
                  onChange={(event) =>
                    setAuthForm((prev) => ({ ...prev, password: event.target.value }))
                  }
                  required
                />
              </label>

              <button className="submit-button" type="submit">
                {authView === "login" ? "Login" : "Register"}
              </button>
            </form>

            <div className="account-summary">
              {auth ? (
                <>
                  <strong>{auth.user.full_name}</strong>
                  <span>{auth.user.email}</span>
                  <button className="ghost-action" type="button" onClick={logout}>
                    Logout
                  </button>
                </>
              ) : (
                <span>Guest mode aktif. Login bersifat opsional untuk mencoba translasi.</span>
              )}
            </div>
          </div>
        </Modal>
      )}
    </main>
  );
}

function PhoneFrame({
  children,
  className,
  title,
}: {
  children: ReactNode;
  className?: string;
  title: string;
}) {
  return (
    <article className={className}>
      <div className="phone-shell">
        <div className="phone-notch" aria-hidden="true" />
        <div className="phone-screen" aria-label={title}>
          {children}
        </div>
      </div>
    </article>
  );
}

function PhoneNav({
  active,
  onChange,
  onSettings,
}: {
  active: MobileScreen;
  onChange: (value: MobileScreen) => void;
  onSettings: () => void;
}) {
  return (
    <nav className="phone-nav" aria-label="Primary">
      <button
        type="button"
        className={active === "home" ? "nav-active" : ""}
        onClick={() => onChange("home")}
      >
        <Home size={15} />
      </button>
      <button
        type="button"
        className={active === "lesson" ? "nav-active" : ""}
        onClick={() => onChange("lesson")}
      >
        <BookOpen size={15} />
      </button>
      <button
        type="button"
        className={active === "live" ? "nav-active nav-live" : "nav-live"}
        onClick={() => onChange("live")}
      >
        <Hand size={16} />
      </button>
      <button type="button" onClick={() => onChange("live")}>
        <HeartHandshake size={15} />
      </button>
      <button type="button" onClick={onSettings}>
        <Settings size={15} />
      </button>
    </nav>
  );
}

function Modal({
  children,
  title,
  onClose,
}: {
  children: ReactNode;
  title: string;
  onClose: () => void;
}) {
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label={title}>
      <div className="modal-card">
        <div className="modal-head">
          <div>
            <span className="card-label">V-Talk Control</span>
            <h2>{title}</h2>
          </div>
          <button className="icon-bubble" type="button" onClick={onClose}>
            <X size={16} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: StatusChip }) {
  return <div className={`status-pill status-pill--${status.tone}`}>{status.label}</div>;
}

function readStorage<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeStorage<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

function buildJsonHeaders(token?: string) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
}

function normalizeBaseUrl(value: string) {
  if (!value) throw new Error("Backend URL belum diisi.");
  return value.replace(/\/+$/, "");
}

function buildWebSocketUrl(baseUrl: string) {
  const parsed = new URL(normalizeBaseUrl(baseUrl));
  const protocol = parsed.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${parsed.host}/ws/translations`;
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(value));
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  return "Terjadi kesalahan yang tidak diketahui.";
}
