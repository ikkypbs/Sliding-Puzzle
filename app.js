// --- STATE & KONFIGURASI GLOBAL ---
let currentMode = 'single'; // 'single' atau 'multi'
let gameActive = false;
let startTime = null;
let timerInterval = null;
let appState = "tracking"; // 'tracking', 'countdown', 'puzzle', 'shattering'

// Konfigurasi Grid & Batas Sensor dari Project 1
const GRID = 3;
const PINCH_THRESHOLD = 0.055;
const FRAME_PADDING = 28;
const FREEZE_HOLD_MS = 250;
const COUNTDOWN_SECONDS = 3;
const FIST_HOLD_FRAMES = 12;
const SNAP_DISTANCE_RATIO = 0.45;
const LOAD_TIMEOUT_MS = 20000;

// Konfigurasi Efek Foto & Galeri Strip (Project 1)
const PHOTOBOOTH_CONTRAST_ALPHA = 1.3;
const PHOTOBOOTH_BRIGHTNESS_BETA = 10;
const PHOTOBOOTH_NOISE_STD = 15;
const STRIP_MAX_PHOTOS = 3;
const galleryEntries = [];

// Struktur Puzzle untuk Arena Terpisah
const puzzleP1 = { boardBox: null, pieces: [], solved: false, tileW: 0, tileH: 0, fullCanvas: null };
const puzzleP2 = { boardBox: null, pieces: [], solved: false, tileW: 0, tileH: 0, fullCanvas: null };

// Mengontrol Logika Geser untuk Masing-masing Tangan
const dragP1 = { activeHand: null, piece: null, offsetX: 0, offsetY: 0 };
const dragP2 = { activeHand: null, piece: null, offsetX: 0, offsetY: 0 };

const freezeGate = { holding: false, since: 0 };
const countdown = { active: false, startedAt: 0 };
let fistHoldCounter = 0;

// Struktur Landmark MediaPipe Hands 21 Titik
const LM = {
    WRIST: 0, THUMB_TIP: 4, INDEX_MCP: 5, INDEX_TIP: 8,
    MIDDLE_MCP: 9, MIDDLE_TIP: 12, RING_MCP: 13, RING_TIP: 16, PINKY_MCP: 17, PINKY_TIP: 20
};

const HAND_CONNECTIONS = [
    [0, 1], [1, 2], [2, 3], [3, 4], [0, 5], [5, 6], [6, 7], [7, 8],
    [5, 9], [9, 10], [10, 11], [11, 12], [9, 13], [13, 14], [14, 15], [15, 16],
    [13, 17], [17, 18], [18, 19], [19, 20], [0, 17]
];

// --- ELEMEN DOM ---
const menuScreen = document.getElementById("menu-screen");
const gameScreen = document.getElementById("game-screen");
const btnSingle = document.getElementById("btn-single");
const btnMulti = document.getElementById("btn-multi");
const btnStart = document.getElementById("btn-start");
const btnBack = document.getElementById("btn-back");
const timerEl = document.getElementById("timer");
const player2Side = document.getElementById("player2-side");
const p1Label = document.getElementById("p1-label");

const videoEl = document.getElementById("webcam");
const canvasP1 = document.getElementById("canvas-p1");
const ctxP1 = canvasP1.getContext("2d", { willReadFrequently: true });
const canvasP2 = document.getElementById("canvas-p2");
const ctxP2 = canvasP2.getContext("2d", { willReadFrequently: true });

const galleryStrip = document.getElementById("galleryStrip");
const galleryEmpty = document.getElementById("galleryEmpty");
const galleryCount = document.getElementById("galleryCount");
const downloadStripBtn = document.getElementById("downloadStripBtn");
const resetAllBtn = document.getElementById("resetAllBtn");

// --- INTERAKSI NAVIGASI MENU ---
btnSingle.addEventListener("click", () => {
    btnSingle.classList.add("active");
    btnMulti.classList.remove("active");
    currentMode = 'single';
});

btnMulti.addEventListener("click", () => {
    btnMulti.classList.add("active");
    btnSingle.classList.remove("active");
    currentMode = 'multi';
});

btnStart.addEventListener("click", async () => {
    menuScreen.classList.add("hidden");
    gameScreen.classList.remove("hidden");
    
    if (currentMode === 'multi') {
        player2Side.classList.remove("hidden");
        p1Label.textContent = "Pemain 1 (Tangan Kanan)";
    } else {
        player2Side.classList.add("hidden");
        p1Label.textContent = "Pemain Wajahmu";
    }
    await startAIEngine();
});

btnBack.addEventListener("click", () => {
    stopGameAndTimer();
    resetEverything();
    gameScreen.classList.add("hidden");
    menuScreen.classList.remove("hidden");
});

// --- INITIALIZE MEDIAPIPE WEB CORE ---
async function startAIEngine() {
    canvasP1.width = 400; canvasP1.height = 400;
    canvasP2.width = 400; canvasP2.height = 400;

    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: { width: 640, height: 480 }, audio: false
        });
        videoEl.srcObject = stream;
    } catch (err) {
        alert("Akses webcam bermasalah: " + err.message);
        return;
    }

    const hands = new Hands({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
    });

    hands.setOptions({
        maxNumHands: 2, modelComplexity: 1, minDetectionConfidence: 0.6, minTrackingConfidence: 0.6
    });

    hands.onResults(onHandResults);

    const camera = new Camera(videoEl, {
        onFrame: async () => { await hands.send({ image: videoEl }); },
        width: 640, height: 480
    });
    camera.start();
    gameActive = true;
    appState = "tracking";
    updateStripDownloadAvailability();
}

// --- CORE PROCESSOR PER BINGKAI AI ---
function onHandResults(results) {
    if (!gameActive) return;

    ctxP1.clearRect(0, 0, canvasP1.width, canvasP1.height);
    ctxP2.clearRect(0, 0, canvasP2.width, canvasP2.height);

    if (appState === "tracking" || appState === "countdown") {
        drawLiveMirror(ctxP1);
        if (currentMode === 'multi') drawLiveMirror(ctxP2);
    } else if (appState === "puzzle") {
        drawBoardAndPieces(ctxP1, puzzleP1);
        if (currentMode === 'multi') drawBoardAndPieces(ctxP2, puzzleP2);
    }

    const handsLandmarks = results.multiHandLandmarks || [];

    if (handsLandmarks.length === 0) {
        fistHoldCounter = 0;
        if (appState === "countdown") drawCountdownOverlay();
        return;
    }

    // Aksi 1: Deteksi Kunci Capture Awal (Pinch)
    if (appState === "tracking") {
        if (currentMode === 'single' && handsLandmarks.length === 1) {
            handleSingleCaptureTrigger(handsLandmarks[0]);
        } else if (currentMode === 'multi' && handsLandmarks.length === 2) {
            if (isPinching(handsLandmarks[0]) && isPinching(handsLandmarks[1])) {
                startCountdownSequence();
            }
        }
    }

    // Aksi 2: Gambar Angka Countdown
    if (appState === "countdown") {
        drawCountdownOverlay();
        return;
    }

    // Aksi 3: Kontrol Puzzle Dinamis & Deteksi Simpan Galeri (Kepalan / Fist)
    if (appState === "puzzle") {
        const anyFist = handsLandmarks.some(lm => isFist(lm));
        if (anyFist && (puzzleP1.solved || (currentMode === 'multi' && puzzleP2.solved))) {
            fistHoldCounter++;
            if (fistHoldCounter >= FIST_HOLD_FRAMES) {
                fistHoldCounter = 0;
                savePuzzleToGalleryStrip();
                return;
            }
        } else {
            fistHoldCounter = 0;
        }

        handsLandmarks.forEach((lm, i) => {
            const classification = results.multiHandedness[i];
            const isLeftHand = classification.label === 'Left';
            const pinching = isPinching(lm);
            const indexPx = { x: (1 - lm[LM.INDEX_TIP].x) * canvasP1.width, y: lm[LM.INDEX_TIP].y * canvasP1.height };

            if (currentMode === 'single') {
                drawHandSkeleton(ctxP1, lm, pinching);
                handleSlidingLogic(puzzleP1, dragP1, "Single", pinching, indexPx);
            } else {
                if (!isLeftHand) { // Tangan Kanan Asli -> Arena Kiri (P1)
                    drawHandSkeleton(ctxP1, lm, pinching);
                    handleSlidingLogic(puzzleP1, dragP1, "P1", pinching, indexPx);
