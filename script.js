// Data Chord Murni Audio & Visual Ring Tanpa Beban Teks Lirik Lagi
const CHORD_DATA = {
    '1': { name: 'C',  freqs: [130.81, 261.63, 329.63, 392.00], seventh: 466.16, color: '#00ff00' },
    '4': { name: 'F',  freqs: [174.61, 349.23, 440.00, 523.25], seventh: 659.25, color: '#ff00a5' },
    '5': { name: 'G',  freqs: [98.00,  196.00, 246.94, 293.66], seventh: 349.23, color: '#ff00ff' },
    '3': { name: 'E',  freqs: [164.81, 329.63, 415.30, 493.88], seventh: 587.33, color: '#ffff00' },
    'w': { name: 'Dm', freqs: [146.83, 293.66, 349.23, 440.00], seventh: 523.25, color: '#0078c8' },
    'e': { name: 'Em', freqs: [164.81, 329.63, 392.00, 493.88], seventh: 587.33, color: '#00c8c8' },
    'y': { name: 'Am', freqs: [110.00, 220.00, 261.63, 329.63], seventh: 392.00, color: '#c8c800' },
    '2': { name: 'D',  freqs: [146.83, 293.66, 369.99, 440.00], seventh: 523.25, color: '#ffa500' },
    '6': { name: 'A',  freqs: [110.00, 220.00, 277.18, 329.63], seventh: 392.00, color: '#ffff00' },
    '7': { name: 'B',  freqs: [123.47, 246.94, 311.13, 369.99], seventh: 440.00, color: '#0064ff' },
    'q': { name: 'Cm', freqs: [130.81, 261.63, 311.13, 392.00], seventh: 466.16, color: '#00b400' },
    'r': { name: 'Fm', freqs: [174.61, 349.23, 415.30, 523.25], seventh: 659.25, color: '#c80078' },
    't': { name: 'Gm', freqs: [98.00,  196.00, 233.08, 293.66], seventh: 349.23, color: '#c800c8' },
    'u': { name: 'Bm', freqs: [123.47, 246.94, 293.66, 369.99], seventh: 440.00, color: '#0046c8' }
};

let audioCtx = null;
let activeOscillators = {}; 
let pressedKeys = new Set();
let modifierKeys = new Set(); 
let isSystemActive = false; 

let videoEl, chordDisplay, chordNameEl, btnStart, appBox;

window.addEventListener('DOMContentLoaded', () => {
    btnStart = document.getElementById('btn-start');
    appBox = document.getElementById('app-box');
    videoEl = document.getElementById('webcam');
    chordDisplay = document.getElementById('chord-display');
    chordNameEl = document.getElementById('chord-name');

    btnStart.addEventListener('click', () => {
        btnStart.style.display = 'none'; 
        appBox.classList.remove('hidden-app'); 
        isSystemActive = true;
        
        initAudio();
        startWebcam();
    });
});

function startWebcam() {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices.getUserMedia({ video: { width: 1280, height: 720 } })
            .then(stream => { videoEl.srcObject = stream; })
            .catch(err => console.error("Gagal akses kamera: ", err));
    }
}

function initAudio() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
}

window.addEventListener('keydown', (e) => {
    if (!isSystemActive) return;
    initAudio();
    const key = e.key.toLowerCase();
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') modifierKeys.add(e.key);
    
    if (CHORD_DATA[key] && !pressedKeys.has(key)) {
        pressedKeys.add(key);
        playChord(key);
    }
});

window.addEventListener('keyup', (e) => {
    if (!isSystemActive) return;
    const key = e.key.toLowerCase();
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') modifierKeys.delete(e.key);
    
    if (pressedKeys.has(key)) {
        pressedKeys.delete(key);
        stopChord(key);
    }
});

function playChord(key) {
    const chord = CHORD_DATA[key];
    const is7th = modifierKeys.has('ArrowUp') || modifierKeys.has('ArrowDown');
    
    activeOscillators[key] = [];
    let freqsToPlay = [...chord.freqs];
    if (is7th) freqsToPlay.push(chord.seventh);

    freqsToPlay.forEach((freq, idx) => {
        let osc = audioCtx.createOscillator();
        let gainNode = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
        let vol = (idx === 0) ? 0.35 : 0.22;
        gainNode.gain.setValueAtTime(vol, audioCtx.currentTime);
        osc.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        osc.start();
        activeOscillators[key].push({ osc, gainNode });
    });

    if (chordNameEl && chordDisplay) {
        let suffix = is7th ? "7" : (key.match(/[1-7]/) ? " Maj" : "");
        chordNameEl.innerText = `PLAYING: ${chord.name}${suffix}`;
        chordDisplay.style.borderLeftColor = chord.color;
        chordDisplay.classList.remove('hidden');
    }
}

function stopChord(key) {
    if (activeOscillators[key]) {
        activeOscillators[key].forEach(track => {
            track.gainNode.gain.setTargetAtTime(0, audioCtx.currentTime, 0.05);
            setTimeout(() => {
                try { track.osc.stop(); track.osc.disconnect(); } catch(e) {}
            }, 200);
        });
        delete activeOscillators[key];
    }
    
    if (pressedKeys.size === 0) {
        if (chordDisplay) chordDisplay.classList.add('hidden');
    }
}