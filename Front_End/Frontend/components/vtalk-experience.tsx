"use client";

import Image from "next/image";
import type { FormEvent, PointerEvent, ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  BookOpen,
  CalendarDays,
  Camera,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleDot,
  Eye,
  EyeOff,
  Home,
  LogOut,
  Moon,
  Settings,
  Sun,
  UserRound,
  Video,
  X,
} from "lucide-react";

type TransportMode = "websocket" | "rest";
type AuthView = "login" | "register";
type MobileScreen = "home" | "lesson" | "live";
type StatusTone = "idle" | "success" | "warning" | "danger";
type FeedbackRating = "correct" | "incorrect" | "uncertain";
type ThemeMode = "light" | "dark";
type ToastTone = "success" | "danger";

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

type AuthToast = {
  id: number;
  tone: ToastTone;
  title: string;
  message: string;
};

const STORAGE_KEYS = {
  config: "vtalk.next.config",
  auth: "vtalk.next.auth",
  transcript: "vtalk.next.transcript",
  theme: "vtalk.next.theme",
};

const DEFAULT_BACKEND_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/+$/, "") || "http://127.0.0.1:8000";

const DEFAULT_TRANSPORT_MODE: TransportMode =
  process.env.NEXT_PUBLIC_DEFAULT_TRANSPORT === "rest" ? "rest" : "websocket";

const APP_TAGLINE = "Edukasi bahasa isyarat: menjembatani komunikasi serta mewujudkan kesetaraan.";
const AUTH_MIN_PASSWORD_LENGTH = 8;

const DEFAULT_CONFIG: SettingsConfig = {
  backendUrl: DEFAULT_BACKEND_URL,
  transportMode: DEFAULT_TRANSPORT_MODE,
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

const SIBI_LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").map((letter) => ({
  letter,
  image: `/signs/sibi-${letter.toLowerCase()}.webp`,
}));

const COMMON_WORDS = [
  { code: "ILY", phrase: "I Love You" },
  { code: "TY", phrase: "Thank You" },
  { code: "SRY", phrase: "Sorry" },
  { code: "PLS", phrase: "Please" },
  { code: "HELP", phrase: "Help" },
  { code: "STOP", phrase: "Stop" },
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
  const sibiDragStartRef = useRef<number | null>(null);
  const sibiDragOffsetRef = useRef(0);
  const commonDragStartRef = useRef<number | null>(null);
  const commonDragOffsetRef = useRef(0);
  const toastTimerRef = useRef<number | null>(null);

  const [config, setConfig] = useState<SettingsConfig>(() =>
    readStorage(STORAGE_KEYS.config, DEFAULT_CONFIG),
  );
  const [auth, setAuth] = useState<AuthSession | null>(() =>
    readStorage<AuthSession | null>(STORAGE_KEYS.auth, null),
  );
  const [authView, setAuthView] = useState<AuthView>("login");
  const [activeScreen, setActiveScreen] = useState<MobileScreen>("home");
  const [themeMode, setThemeMode] = useState<ThemeMode>(() =>
    readStorage<ThemeMode>(STORAGE_KEYS.theme, "light"),
  );
  const [, setIsSettingsOpen] = useState(false);
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
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isAuthPasswordTouched, setIsAuthPasswordTouched] = useState(false);
  const [authToast, setAuthToast] = useState<AuthToast | null>(null);
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const [activeSibiIndex, setActiveSibiIndex] = useState(0);
  const [sibiDragStart, setSibiDragStart] = useState<number | null>(null);
  const [sibiDragOffset, setSibiDragOffset] = useState(0);
  const [sibiSlideDirection, setSibiSlideDirection] = useState<0 | 1 | -1>(0);
  const [activeCommonIndex, setActiveCommonIndex] = useState(0);
  const [commonDragStart, setCommonDragStart] = useState<number | null>(null);
  const [commonDragOffset, setCommonDragOffset] = useState(0);
  const [commonSlideDirection, setCommonSlideDirection] = useState<0 | 1 | -1>(0);

  useEffect(() => {
    writeStorage(STORAGE_KEYS.config, config);
  }, [config]);

  useEffect(() => {
    writeStorage(STORAGE_KEYS.transcript, transcript);
  }, [transcript]);

  useEffect(() => {
    writeStorage(STORAGE_KEYS.theme, themeMode);
  }, [themeMode]);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) {
        window.clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (auth) {
      writeStorage(STORAGE_KEYS.auth, auth);
    } else if (typeof window !== "undefined") {
      window.localStorage.removeItem(STORAGE_KEYS.auth);
    }
  }, [auth]);

  useEffect(() => {
    let ignore = false;

    async function loadTranslationHistory() {
      if (!auth?.token) {
        setHistory([]);
        return;
      }

      try {
        const response = await fetch(
          `${normalizeBaseUrl(config.backendUrl)}/api/v1/translations/history?limit=12`,
          {
            headers: buildJsonHeaders(auth.token),
          },
        );
        const payload = await response.json();
        if (!response.ok || !payload.success || ignore) return;
        const rows = payload.data as TranslationResult[];
        setHistory(rows.slice(0, 6));
        setTranscript(rows.map((row) => row.predicted_text).reverse().slice(-24));
      } catch {
        if (!ignore) {
          setHistory([]);
        }
      }
    }

    void loadTranslationHistory();

    return () => {
      ignore = true;
    };
  }, [auth?.token, config.backendUrl]);

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
  const activeSibiLetter = SIBI_LETTERS[activeSibiIndex];
  const activeCommonWord = COMMON_WORDS[activeCommonIndex];
  const greetingName = auth?.user.full_name.trim().split(/\s+/)[0];
  const shouldShowPasswordWarning =
    isAuthPasswordTouched && authForm.password.length < AUTH_MIN_PASSWORD_LENGTH;

  function updateSibiLetter(direction: number) {
    setActiveSibiIndex((value) => (value + direction + SIBI_LETTERS.length) % SIBI_LETTERS.length);
  }

  function showSibiLetter(direction: 1 | -1) {
    if (sibiSlideDirection !== 0) return;
    setSibiSlideDirection(direction);
    window.setTimeout(() => {
      updateSibiLetter(direction);
      setSibiSlideDirection(0);
    }, 210);
  }

  function startSibiDrag(event: PointerEvent<HTMLDivElement>) {
    sibiDragStartRef.current = event.clientX;
    sibiDragOffsetRef.current = 0;
    setSibiDragStart(event.clientX);
    setSibiDragOffset(0);
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function moveSibiDrag(event: PointerEvent<HTMLDivElement>) {
    const dragStart = sibiDragStartRef.current ?? sibiDragStart;
    if (dragStart === null) return;
    const nextOffset = Math.max(-86, Math.min(86, event.clientX - dragStart));
    sibiDragOffsetRef.current = nextOffset;
    setSibiDragOffset(nextOffset);
  }

  function endSibiDrag() {
    const finalOffset = sibiDragOffsetRef.current;
    if (Math.abs(finalOffset) > 42) {
      updateSibiLetter(finalOffset < 0 ? 1 : -1);
    }
    sibiDragStartRef.current = null;
    sibiDragOffsetRef.current = 0;
    setSibiDragStart(null);
    setSibiDragOffset(0);
  }

  function updateCommonWord(direction: number) {
    setActiveCommonIndex((value) => (value + direction + COMMON_WORDS.length) % COMMON_WORDS.length);
  }

  function showCommonWord(direction: 1 | -1) {
    if (commonSlideDirection !== 0) return;
    setCommonSlideDirection(direction);
    window.setTimeout(() => {
      updateCommonWord(direction);
      setCommonSlideDirection(0);
    }, 210);
  }

  function startCommonDrag(event: PointerEvent<HTMLDivElement>) {
    commonDragStartRef.current = event.clientX;
    commonDragOffsetRef.current = 0;
    setCommonDragStart(event.clientX);
    setCommonDragOffset(0);
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function moveCommonDrag(event: PointerEvent<HTMLDivElement>) {
    const dragStart = commonDragStartRef.current ?? commonDragStart;
    if (dragStart === null) return;
    const nextOffset = Math.max(-86, Math.min(86, event.clientX - dragStart));
    commonDragOffsetRef.current = nextOffset;
    setCommonDragOffset(nextOffset);
  }

  function endCommonDrag() {
    const finalOffset = commonDragOffsetRef.current;
    if (Math.abs(finalOffset) > 42) {
      updateCommonWord(finalOffset < 0 ? 1 : -1);
    }
    commonDragStartRef.current = null;
    commonDragOffsetRef.current = 0;
    setCommonDragStart(null);
    setCommonDragOffset(0);
  }

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
      const socket = new WebSocket(buildWebSocketUrl(config.backendUrl, auth?.token));
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
    setIsAuthPasswordTouched(true);

    if (authForm.password.length < AUTH_MIN_PASSWORD_LENGTH) {
      const message = `Password minimal ${AUTH_MIN_PASSWORD_LENGTH} karakter.`;
      setTransportStatus({ tone: "warning", label: message });
      showAuthToast("danger", "Password belum valid", message);
      return;
    }

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
      const data = await response.json().catch(() => null);
      if (!response.ok || !data.success) {
        throw new Error(readApiErrorMessage(data, `Autentikasi gagal (${response.status})`));
      }

      if (authView === "register") {
        setAuthView("login");
        setAuthForm((prev) => ({ ...prev, password: "" }));
        setIsAuthPasswordTouched(false);
        setTransportStatus({ tone: "success", label: "Registrasi berhasil" });
        showAuthToast(
          "success",
          "Registrasi berhasil",
          "Akun berhasil dibuat. Silakan login untuk menyimpan sesi V-Talk.",
        );
        return;
      }

      const user = data.data.user as AuthUser;
      stopSession("Session login berubah. Mulai ulang translasi saat siap.");
      clearSessionData();
      setAuth({
        token: data.data.access_token as string,
        user,
      });
      setAuthForm({ fullName: "", email: "", password: "" });
      setIsAuthPasswordTouched(false);
      setIsAuthOpen(false);
      setTransportStatus({ tone: "success", label: "Login berhasil" });
      showAuthToast(
        "success",
        "Login berhasil",
        `Halo ${user.full_name.trim().split(/\s+/)[0]}, sesi V-Talk sudah aktif.`,
      );
    } catch (error) {
      const message = getErrorMessage(error);
      setTransportStatus({ tone: "danger", label: message });
      showAuthToast(
        "danger",
        authView === "register" ? "Registrasi gagal" : "Login gagal",
        message,
      );
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
    stopSession("Logout berhasil. Guest mode aktif.");
    clearSessionData();
    setAuth(null);
    setIsAuthOpen(false);
    setTransportStatus({ tone: "idle", label: "Guest mode aktif" });
    showAuthToast("success", "Logout berhasil", "Sesi pengguna sudah ditutup.");
  }

  function switchAuthView(view: AuthView) {
    setAuthView(view);
    setIsAuthPasswordTouched(false);
  }

  function toggleTheme() {
    setThemeMode((value) => (value === "light" ? "dark" : "light"));
  }

  function showAuthToast(tone: ToastTone, title: string, message: string) {
    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current);
    }
    setAuthToast({ id: Date.now(), tone, title, message });
    toastTimerRef.current = window.setTimeout(() => {
      setAuthToast(null);
      toastTimerRef.current = null;
    }, 4200);
  }

  const themeToggle = (
    <button className="icon-bubble theme-toggle-button" type="button" onClick={toggleTheme}>
      {themeMode === "light" ? <Moon size={15} /> : <Sun size={15} />}
    </button>
  );

  function renderTopBarAuthAction() {
    return (
      <button
        className="login-action"
        type="button"
        onClick={auth ? logout : () => setIsAuthOpen(true)}
      >
        {auth ? <LogOut size={17} /> : <UserRound size={17} />}
        <span>{auth ? "Logout" : "Login"}</span>
      </button>
    );
  }

  const homePhone = (
    <PhoneFrame
      title="Home"
      className={`phone phone--left ${activeScreen === "home" ? "phone--focused" : ""}`}
    >
      <div className="home-action-bar">
        <span className="home-status-pill">Selamat Datang</span>
        <div className="top-icon-actions">
          {themeToggle}
          {renderTopBarAuthAction()}
        </div>
      </div>

      <section className="brand-card" aria-label="V-Talk introduction">
        <div className="mobile-brand">
          <Image
            className="mobile-brand-logo"
            src="/logo.webp"
            alt="V-Talk logo"
            width={40}
            height={40}
            priority
          />
          <div>
            <p className="welcome-title">V-Talk</p>
            <p className="welcome-subtitle">Edukasi Bahasa Isyarat</p>
          </div>
        </div>
        <div className="brand-sibi-mark" aria-label="SIBI Indonesia">
          <span className="indonesia-flag" aria-hidden="true" />
          <span>SIBI</span>
        </div>
      </section>

      <button className="primary-flow-card" type="button" onClick={() => setActiveScreen("live")}>
        <div>
          <strong>Mulai Interpreter</strong>
          <p>Aktifkan kamera dan mulai translasi.</p>
        </div>
        <span className="primary-flow-arrow" aria-hidden="true">
          <Camera size={19} />
        </span>
      </button>

      <section className="mini-section">
        <div className="section-row">
          <h3>Continue Lessons</h3>
          <button className="link-button" type="button" onClick={() => setActiveScreen("lesson")}>
            See all
          </button>
        </div>
        <div className="sibi-deck">
          <button
            className="sibi-nav"
            type="button"
            aria-label="Huruf sebelumnya"
            onClick={() => showSibiLetter(-1)}
          >
            <ChevronLeft size={15} />
          </button>
          <div
            className="sibi-card-stack"
            onPointerDown={startSibiDrag}
            onPointerMove={moveSibiDrag}
            onPointerUp={endSibiDrag}
            onPointerCancel={endSibiDrag}
          >
            <div className="sibi-card-back sibi-card-back--two" aria-hidden="true" />
            <div className="sibi-card-back sibi-card-back--one" aria-hidden="true" />
            <article
              className={`sibi-letter-card ${
                sibiSlideDirection === 1
                  ? "sibi-letter-card--slide-next"
                  : sibiSlideDirection === -1
                    ? "sibi-letter-card--slide-prev"
                    : ""
              }`}
              style={
                sibiDragStart !== null
                  ? {
                      transform: `translateX(${sibiDragOffset}px) rotate(${sibiDragOffset / 18}deg)`,
                    }
                  : undefined
              }
            >
              <div className="sibi-letter-art">
                <Image
                  src={activeSibiLetter.image}
                  alt={`Isyarat SIBI huruf ${activeSibiLetter.letter}`}
                  width={220}
                  height={220}
                  draggable={false}
                />
              </div>
              <div className="sibi-letter-copy sibi-letter-copy--alphabet">
                <span>SIBI Alphabet</span>
                <strong>Huruf {activeSibiLetter.letter}</strong>
              </div>
              <div className="sibi-progress-ring">
                <span>{activeSibiIndex + 1}</span>
                <small>/26</small>
              </div>
            </article>
          </div>
          <button
            className="sibi-nav"
            type="button"
            aria-label="Huruf berikutnya"
            onClick={() => showSibiLetter(1)}
          >
            <ChevronRight size={15} />
          </button>
        </div>
        <div className="sibi-progress-track" aria-label={`Huruf ${activeSibiLetter.letter} dari 26`}>
          <span
            className="sibi-progress-line"
            style={{ width: `${26 + ((activeSibiIndex + 1) / SIBI_LETTERS.length) * 36}px` }}
          />
          <span className="sibi-progress-dot" />
          <span className="sibi-progress-dot" />
        </div>

        <div className="sibi-deck sibi-deck--common">
          <button
            className="sibi-nav sibi-nav--common"
            type="button"
            aria-label="Common word sebelumnya"
            onClick={() => showCommonWord(-1)}
          >
            <ChevronLeft size={15} />
          </button>
          <div
            className="sibi-card-stack"
            onPointerDown={startCommonDrag}
            onPointerMove={moveCommonDrag}
            onPointerUp={endCommonDrag}
            onPointerCancel={endCommonDrag}
          >
            <div className="sibi-card-back sibi-card-back--two sibi-card-back--common" aria-hidden="true" />
            <div className="sibi-card-back sibi-card-back--one sibi-card-back--common" aria-hidden="true" />
            <article
              className={`sibi-letter-card sibi-letter-card--common ${
                commonSlideDirection === 1
                  ? "sibi-letter-card--slide-next"
                  : commonSlideDirection === -1
                    ? "sibi-letter-card--slide-prev"
                    : ""
              }`}
              style={
                commonDragStart !== null
                  ? {
                      transform: `translateX(${commonDragOffset}px) rotate(${commonDragOffset / 18}deg)`,
                    }
                  : undefined
              }
            >
              <div className={`common-word-art common-word-art--${activeCommonWord.code.length}`}>
                {activeCommonWord.code.split("").map((letter, index) => (
                  <Image
                    key={`${activeCommonWord.code}-${letter}-${index}`}
                    className={activeCommonWord.code.length === 3 && index === 0 ? "common-word-art-center" : ""}
                    src={`/signs/sibi-${letter.toLowerCase()}.webp`}
                    alt={`Isyarat SIBI huruf ${letter}`}
                    width={220}
                    height={220}
                    draggable={false}
                  />
                ))}
              </div>
              <div className="sibi-letter-copy common-word-copy">
                <span>Common Words</span>
                <strong>{activeCommonWord.code}</strong>
                <p>{activeCommonWord.phrase}</p>
              </div>
              <div className="sibi-progress-ring sibi-progress-ring--common">
                <span>{activeCommonIndex + 1}</span>
                <small>/{COMMON_WORDS.length}</small>
              </div>
            </article>
          </div>
          <button
            className="sibi-nav sibi-nav--common"
            type="button"
            aria-label="Common word berikutnya"
            onClick={() => showCommonWord(1)}
          >
            <ChevronRight size={15} />
          </button>
        </div>
        <div className="sibi-progress-track sibi-progress-track--common" aria-label={`${activeCommonWord.code} dari 6`}>
          <span
            className="sibi-progress-line sibi-progress-line--common"
            style={{ width: `${26 + ((activeCommonIndex + 1) / COMMON_WORDS.length) * 36}px` }}
          />
          <span className="sibi-progress-dot sibi-progress-dot--common" />
          <span className="sibi-progress-dot sibi-progress-dot--common" />
        </div>
      </section>

      <section className="mini-section compact-section">
        <div className="section-row">
          <h3>Daily Tracker</h3>
          <CalendarDays size={14} />
        </div>
        <div className="tracker-grid">
          {WEEK_TRACKER.map((item) => (
            <div key={item.day} className={`tracker-cell ${item.done ? "tracker-cell--done" : ""}`}>
              <span>{item.day}</span>
              {item.done ? <CheckCircle2 size={13} /> : <CircleDot size={12} />}
            </div>
          ))}
        </div>
      </section>

      <section className="mini-section">
        <div className="sign-day">
          <span className="card-label">
            <CalendarDays size={17} />
            Sign of the Day
          </span>
        </div>
      </section>

      <section className="lesson-grid lesson-grid--simple">
        {LESSON_CARDS.slice(0, 2).map((card) => (
          <button
            key={card.title}
            type="button"
            className={`lesson-card ${card.accent}`}
            onClick={() => setActiveScreen("lesson")}
          >
            <span className="lesson-card-glyph lesson-card-glyph--sign">
              {card.title === "Common Words" ? (
                <>
                  <Image
                    src="/signs/sibi-i.webp"
                    alt=""
                    width={120}
                    height={120}
                    draggable={false}
                  />
                  <Image
                    src="/signs/sibi-y.webp"
                    alt=""
                    width={120}
                    height={120}
                    draggable={false}
                  />
                </>
              ) : (
                <Image
                  src="/signs/sibi-a.webp"
                  alt=""
                  width={120}
                  height={120}
                  draggable={false}
                />
              )}
            </span>
            <strong>{card.title}</strong>
          </button>
        ))}
      </section>

    </PhoneFrame>
  );

  const lessonPhone = (
    <PhoneFrame
      title="Lesson"
      className={`phone phone--center ${activeScreen === "lesson" ? "phone--focused" : ""}`}
    >
      <div className="home-action-bar lesson-action-bar">
        <div className="lesson-back-group">
          <button className="icon-bubble lesson-back-button" type="button" onClick={() => setActiveScreen("home")}>
            <ChevronLeft size={15} />
          </button>
          <span className="lesson-user-greeting">
            {greetingName ? `Halo ${greetingName}` : "Guest Mode"}
          </span>
        </div>
        <div className="top-icon-actions">
          {themeToggle}
          {renderTopBarAuthAction()}
        </div>
      </div>

      <button className="primary-flow-card" type="button" onClick={() => setActiveScreen("live")}>
        <div>
          <strong>Mulai Interpreter</strong>
          <p>Aktifkan kamera dan mulai translasi.</p>
        </div>
        <span className="primary-flow-arrow" aria-hidden="true">
          <Camera size={19} />
        </span>
      </button>

      <section className="feature-card">
        <div className="feature-card-head">
          <span className="card-label">SIBI Alphabet</span>
          <button
            className="feature-camera-button"
            type="button"
            aria-label="Buka interpreter kamera"
            onClick={() => setActiveScreen("live")}
          >
            <Camera size={15} />
          </button>
        </div>
        <div className="feature-sign feature-sign--image">
          <Image
            src={activeSibiLetter.image}
            alt={`Isyarat SIBI huruf ${activeSibiLetter.letter}`}
            width={180}
            height={180}
            draggable={false}
          />
        </div>
        <h3 className="feature-title">Huruf {activeSibiLetter.letter}</h3>
        <p className="feature-subtitle">Alphabet</p>
      </section>

      <div className="pager-row">
        <button
          className="icon-bubble icon-bubble--flat icon-bubble--alphabet"
          type="button"
          aria-label="Huruf sebelumnya"
          onClick={() => showSibiLetter(-1)}
        >
          <ChevronLeft size={15} />
        </button>
        <button
          className="icon-bubble icon-bubble--flat icon-bubble--alphabet"
          type="button"
          aria-label="Huruf berikutnya"
          onClick={() => showSibiLetter(1)}
        >
          <ChevronRight size={15} />
        </button>
      </div>

      <div className="lesson-card-separator" aria-hidden="true">
        <span />
      </div>

      <section className="feature-card feature-card--common">
        <div className="feature-card-head">
          <span className="card-label">Common Words</span>
          <button
            className="feature-camera-button"
            type="button"
            aria-label="Buka interpreter kamera"
            onClick={() => setActiveScreen("live")}
          >
            <Camera size={15} />
          </button>
        </div>
        <div className={`feature-common-art common-word-art common-word-art--${activeCommonWord.code.length}`}>
          {activeCommonWord.code.split("").map((letter, index) => (
            <Image
              key={`lesson-${activeCommonWord.code}-${letter}-${index}`}
              className={activeCommonWord.code.length === 3 && index === 0 ? "common-word-art-center" : ""}
              src={`/signs/sibi-${letter.toLowerCase()}.webp`}
              alt={`Isyarat SIBI huruf ${letter}`}
              width={180}
              height={180}
              draggable={false}
            />
          ))}
        </div>
        <h3 className="feature-title">{activeCommonWord.code}</h3>
        <p className="feature-subtitle">{activeCommonWord.phrase}</p>
      </section>

      <div className="pager-row pager-row--common">
        <button
          className="icon-bubble icon-bubble--flat icon-bubble--common"
          type="button"
          aria-label="Common word sebelumnya"
          onClick={() => showCommonWord(-1)}
        >
          <ChevronLeft size={15} />
        </button>
        <button
          className="icon-bubble icon-bubble--flat icon-bubble--common"
          type="button"
          aria-label="Common word berikutnya"
          onClick={() => showCommonWord(1)}
        >
          <ChevronRight size={15} />
        </button>
      </div>

      <button className="primary-flow-card primary-flow-card--quiet primary-flow-card--active" type="button" onClick={() => setActiveScreen("live")}>
        <strong>Open Interpreter</strong>
      </button>
    </PhoneFrame>
  );

  const livePhone = (
    <PhoneFrame
      title="Interpreter"
      className={`phone phone--right ${activeScreen === "live" ? "phone--focused" : ""}`}
    >
      <div className="home-action-bar lesson-action-bar">
        <div className="lesson-back-group">
          <button className="icon-bubble lesson-back-button" type="button" onClick={() => setActiveScreen("lesson")}>
            <ChevronLeft size={15} />
          </button>
          <span className="lesson-user-greeting">
            {greetingName ? `Halo ${greetingName}` : "Guest Mode"}
          </span>
        </div>
        <div className="top-icon-actions">
          {themeToggle}
          {renderTopBarAuthAction()}
        </div>
      </div>

      <div className="camera-shell">
        <div className={isCameraActive ? "camera-visual" : "camera-visual camera-visual--inactive"}>
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className={config.mirrorCamera ? "camera-video camera-video--mirror" : "camera-video"}
          />
          <canvas ref={canvasRef} className="hidden-canvas" />
          {isCameraActive ? (
            <div className="camera-fallback" aria-hidden="true" />
          ) : (
            <div className="camera-empty-state">
              <span className="camera-empty-icon" aria-hidden="true">
                <Camera size={34} />
              </span>
              <strong>Kamera belum aktif</strong>
              <p>Aktifkan kamera untuk mulai membaca isyarat secara real-time.</p>
              <button className="camera-empty-action" type="button" onClick={startCamera}>
                Mulai Kamera
              </button>
            </div>
          )}
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
            <button
              className="pill-button pill-button--primary"
              type="button"
              onClick={isCameraActive ? stopCamera : startCamera}
            >
              {isCameraActive ? "Stop Camera" : "Start Camera"}
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
            className="tag-button tag-button--correct"
            type="button"
            disabled={!isFeedbackReady}
            onClick={() => void submitFeedback("correct")}
          >
            Hasil Akurat
          </button>
          <button
            className="tag-button tag-button--incorrect"
            type="button"
            disabled={!isFeedbackReady}
            onClick={() => void submitFeedback("incorrect")}
          >
            Hasil Perlu Koreksi
          </button>
        </div>
      </section>
    </PhoneFrame>
  );

  return (
    <main className={`vtalk-page vtalk-page--${themeMode}`}>
      <section className="scene-shell">
        <div className="scene-copy">
          <div>
            <span className="scene-badge">CC26-PSU145 | Inclusive & Resilient Communities</span>
            <div className="scene-brand">
              <Image
                className="scene-logo"
                src="/logo.webp"
                alt="V-Talk logo"
                width={96}
                height={96}
                priority
              />
              <h1>V-Talk</h1>
            </div>
            <p>{APP_TAGLINE}</p>
          </div>

          <div className="scene-status">
            <StatusPill status={healthStatus} />
            <StatusPill status={transportStatus} />
            <button className="ghost-action" type="button" onClick={() => void checkBackendHealth()}>
              Cek Backend
            </button>
          </div>
        </div>

        {isMobileViewport && false ? (
          <div className="desktop-workspace">
            <section className="desktop-hero">
              <div className="desktop-hero-copy">
                <span className="card-label">Realtime Sign Language Platform</span>
                <h2>{APP_TAGLINE}</h2>
                <p>V-Talk menyatukan pembelajaran, interpreter kamera real-time, transcript, dan feedback dalam satu pengalaman yang inklusif.</p>
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
                      placeholder={DEFAULT_BACKEND_URL}
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
                        {item.done ? <CheckCircle2 size={13} /> : <CircleDot size={12} />}
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
                    className="tag-button tag-button--correct"
                    type="button"
                    disabled={!isFeedbackReady}
                    onClick={() => void submitFeedback("correct")}
                  >
                    Hasil Akurat
                  </button>
                  <button
                    className="tag-button tag-button--incorrect"
                    type="button"
                    disabled={!isFeedbackReady}
                    onClick={() => void submitFeedback("incorrect")}
                  >
                    Hasil Perlu Koreksi
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

      <PhoneNav active={activeScreen} onChange={setActiveScreen} />

      {authToast && (
        <div className={`auth-toast auth-toast--${authToast.tone}`} role="status" aria-live="polite">
          <span className="auth-toast-icon" aria-hidden="true">
            {authToast.tone === "success" ? <CheckCircle2 size={19} /> : <X size={18} />}
          </span>
          <div>
            <strong>{authToast.title}</strong>
            <p>{authToast.message}</p>
          </div>
          <button className="auth-toast-close" type="button" onClick={() => setAuthToast(null)}>
            <X size={14} />
          </button>
        </div>
      )}

      {isAuthOpen && (
        <Modal title={authView === "login" ? "Login Session" : "Register Session"} onClose={() => setIsAuthOpen(false)}>
          <div className="modal-stack">
            <div className="segmented auth-tabs">
              <button
                type="button"
                className={authView === "login" ? "segmented--active" : ""}
                onClick={() => switchAuthView("login")}
              >
                Login
              </button>
              <button
                type="button"
                className={authView === "register" ? "segmented--active" : ""}
                onClick={() => switchAuthView("register")}
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

              <div className="field-block">
                <span>Password</span>
                <div
                  className={
                    shouldShowPasswordWarning
                      ? "password-field password-field--invalid"
                      : "password-field"
                  }
                >
                  <input
                    type={isPasswordVisible ? "text" : "password"}
                    value={authForm.password}
                    aria-invalid={shouldShowPasswordWarning}
                    aria-required="true"
                    aria-describedby={shouldShowPasswordWarning ? "auth-password-warning" : undefined}
                    onBlur={() => setIsAuthPasswordTouched(true)}
                    onChange={(event) => {
                      setIsAuthPasswordTouched(true);
                      setAuthForm((prev) => ({ ...prev, password: event.target.value }));
                    }}
                  />
                  <button
                    className="password-toggle"
                    type="button"
                    aria-label={isPasswordVisible ? "Sembunyikan password" : "Tampilkan password"}
                    onClick={() => setIsPasswordVisible((value) => !value)}
                  >
                    {isPasswordVisible ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {shouldShowPasswordWarning && (
                  <p className="field-warning" id="auth-password-warning" role="alert">
                    Password minimal {AUTH_MIN_PASSWORD_LENGTH} karakter.
                  </p>
                )}
              </div>

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
          <div className="phone-scroll">
            {children}
          </div>
        </div>
      </div>
    </article>
  );
}

function PhoneNav({
  active,
  onChange,
}: {
  active: MobileScreen;
  onChange: (value: MobileScreen) => void;
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
        <Camera size={16} />
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
            <h2>{title}</h2>
          </div>
          <button className="icon-bubble modal-close-button" type="button" onClick={onClose}>
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

function buildWebSocketUrl(baseUrl: string, token?: string) {
  const parsed = new URL(normalizeBaseUrl(baseUrl));
  const protocol = parsed.protocol === "https:" ? "wss:" : "ws:";
  parsed.protocol = protocol;
  parsed.pathname = `${parsed.pathname.replace(/\/+$/, "")}/ws/translations`;
  parsed.search = "";
  if (token) {
    parsed.searchParams.set("token", token);
  }
  parsed.hash = "";
  return parsed.toString();
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

function readApiErrorMessage(payload: unknown, fallback: string) {
  if (!payload || typeof payload !== "object") return fallback;
  const record = payload as Record<string, unknown>;
  if (typeof record.message === "string" && record.message.trim()) {
    return record.message;
  }
  if (typeof record.detail === "string" && record.detail.trim()) {
    return record.detail;
  }
  if (Array.isArray(record.detail) && record.detail.length > 0) {
    const first = record.detail[0] as Record<string, unknown>;
    if (typeof first?.msg === "string" && first.msg.trim()) {
      return first.msg;
    }
  }
  return fallback;
}
