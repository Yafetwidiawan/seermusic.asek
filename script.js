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
let mainAnalyser = null; 
let activeOscillators = {}; 
let pressedKeys = new Set();
let modifierKeys = new Set(); 
let isSystemActive = false; 
let currentSoundPreset = 'piano';

// Penyimpan elemen partikel teks chord yang sedang aktif melayang
let activeParticleElements = {};

// Buffer data gelombang untuk membuat transisi pergerakan wave jauh lebih smooth/lambat
let smoothDataArray = null;

let videoEl, chordDisplay, chordNameEl, btnStart, appBox, canvas, canvasCtx, particleContainer;
let imageUploader, uploadPlaceholder, sheetPreview, btnRemoveSheet, sheetBox;

window.addEventListener('DOMContentLoaded', () => {
    btnStart = document.getElementById('btn-start');
    appBox = document.getElementById('app-box');
    videoEl = document.getElementById('webcam');
    chordDisplay = document.getElementById('chord-display');
    chordNameEl = document.getElementById('chord-name');
    canvas = document.getElementById('visualizer');
    canvasCtx = canvas.getContext('2d');
    particleContainer = document.getElementById('particle-container');

    // Setup Komponen Upload Gambar
    sheetBox = document.querySelector('.sheet-box');
    imageUploader = document.getElementById('image-uploader');
    uploadPlaceholder = document.getElementById('upload-placeholder');
    sheetPreview = document.getElementById('sheet-preview');
    btnRemoveSheet = document.getElementById('btn-remove-sheet');

    sheetBox.addEventListener('click', (e) => {
        if (e.target !== btnRemoveSheet && sheetPreview.classList.contains('hidden')) {
            imageUploader.click();
        }
    });

    imageUploader.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(event) {
                sheetPreview.src = event.target.result;
                sheetPreview.classList.remove('hidden');
                btnRemoveSheet.classList.remove('hidden');
                uploadPlaceholder.style.display = 'none';
                sheetBox.style.borderStyle = 'solid';
            };
            reader.readAsDataURL(file);
        }
    });

    btnRemoveSheet.addEventListener('click', (e) => {
        e.stopPropagation();
        imageUploader.value = '';
        sheetPreview.classList.add('hidden');
        btnRemoveSheet.classList.add('hidden');
        uploadPlaceholder.style.display = 'block';
        sheetBox.style.borderStyle = 'dashed';
    });

    // Menangani pemilihan preset instrumen
    const soundButtons = document.querySelectorAll('.sound-btn');
    soundButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            soundButtons.forEach(b => b.classList.remove('active'));
            e.currentTarget.classList.add('active');
            currentSoundPreset = e.currentTarget.getAttribute('data-sound');
        });
    });

    btnStart.addEventListener('click', () => {
        btnStart.style.display = 'none'; 
        appBox.classList.remove('hidden-app'); 
        isSystemActive = true;
        
        initAudio();
        startWebcam();
        resizeCanvas();
        drawWaveform(); 
    });
});

function resizeCanvas() {
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
}

function startWebcam() {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices.getUserMedia({ video: { width: 1280, height: 720 } })
            .then(stream => { videoEl.srcObject = stream; })
            .catch(err => console.error(err));
    }
}

function initAudio() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        mainAnalyser = audioCtx.createAnalyser();
        mainAnalyser.fftSize = 1024; // Diperkecil agar frekuensi sampel gelombang lebih rapat & tenang
        mainAnalyser.connect(audioCtx.destination);
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

    let oscType = 'sine';
    let attackTime = 0.02;
    let baseVolume = 0.25;

    if (currentSoundPreset === 'guitar') { oscType = 'triangle'; attackTime = 0.01; }
    else if (currentSoundPreset === 'brass') { oscType = 'sawtooth'; attackTime = 0.08; baseVolume = 0.15; }
    else if (currentSoundPreset === 'retro') { oscType = 'square'; attackTime = 0.005; baseVolume = 0.12; }

    freqsToPlay.forEach((freq, idx) => {
        let osc = audioCtx.createOscillator();
        let gainNode = audioCtx.createGain();
        osc.type = oscType;
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
        let vol = (idx === 0) ? baseVolume * 1.5 : baseVolume;
        gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
        gainNode.gain.linearRampToValueAtTime(vol, audioCtx.currentTime + attackTime);
        osc.connect(gainNode);
        gainNode.connect(mainAnalyser);
        osc.start();
        activeOscillators[key].push({ osc, gainNode });
    });

    let suffix = is7th ? "7" : (key.match(/[1-7]/) ? " Maj" : "");
    let fullChordName = `${chord.name}${suffix}`;

    // Tampilkan Informasi Box
    chordNameEl.innerText = `PLAYING: ${fullChordName}`;
    chordDisplay.style.borderLeftColor = chord.color;
    chordDisplay.classList.remove('hidden');

    // MEMBUAT LIVE KEY MONITOR ANIMASI (NAIK & GETAR DI TENGAH)
    createFloatingChordParticle(key, fullChordName, chord.color);
}

function createFloatingChordParticle(key, name, color) {
    // Hapus partikel lama jika tombol yang sama ditekan ulang dengan cepat
    if (activeParticleElements[key]) {
        activeParticleElements[key].remove();
    }

    const particle = document.createElement('div');
    particle.className = 'floating-chord';
    particle.innerText = name;
    particle.style.color = color;
    
    particleContainer.appendChild(particle);
    activeParticleElements[key] = particle;

    // Trigger animasi muncul dari bawah dan bergetar di tengah layar via microtask/timeout
    setTimeout(() => {
        particle.classList.add('hold');
    }, 10);
}

function stopChord(key) {
    if (activeOscillators[key]) {
        activeOscillators[key].forEach(track => {
            let releaseTime = (currentSoundPreset === 'guitar') ? 0.4 : 0.15;
            track.gainNode.gain.setTargetAtTime(0, audioCtx.currentTime, releaseTime / 3);
            setTimeout(() => {
                try { track.osc.stop(); track.osc.disconnect(); } catch(e) {}
            }, releaseTime * 1000);
        });
        delete activeOscillators[key];
    }
    
    // PEMBARUAN LIVE KEY MONITOR: LEPAS DAN LENYAP KE ATAS
    if (activeParticleElements[key]) {
        const particle = activeParticleElements[key];
        particle.classList.remove('hold');
        particle.classList.add('fade-away'); // Naik ke atas dan opacity meredup
        
        // Hapus elemen dari dokumen setelah animasi hilangnya selesai
        setTimeout(() => {
            particle.remove();
        }, 500);
        delete activeParticleElements[key];
    }

    if (pressedKeys.size === 0) {
        chordDisplay.classList.add('hidden');
    }
}

// LOOP ANIMASI: Menggambar Gelombang Suara (SANGAT SMOOTH & AGAK PELAN)
function drawWaveform() {
    requestAnimationFrame(drawWaveform);
    if (!mainAnalyser) return;

    const bufferLength = mainAnalyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    mainAnalyser.getByteTimeDomainData(dataArray);

    // Menginisialisasi smooth array di putaran pertama
    if (!smoothDataArray) {
        smoothDataArray = new Float32Array(bufferLength);
        for (let i = 0; i < bufferLength; i++) smoothDataArray[i] = dataArray[i];
    }

    canvasCtx.clearRect(0, 0, canvas.width, canvas.height);
    canvasCtx.lineWidth = 3.5;

    let activeChordKey = Object.keys(activeOscillators)[0];
    canvasCtx.strokeStyle = activeChordKey ? CHORD_DATA[activeChordKey].color : '#00ffff'; 
    canvasCtx.beginPath();

    const sliceWidth = canvas.width / bufferLength;
    let x = 0;

    for (let i = 0; i < bufferLength; i++) {
        // RUMUS REDAMAN (DAMPING): 92% data lama + 8% data baru. Membuat ombak bergerak sangat tenang & lambat.
        smoothDataArray[i] = (smoothDataArray[i] * 0.92) + (dataArray[i] * 0.08);

        const v = smoothDataArray[i] / 128.0;
        const y = (v * canvas.height) / 2;

        if (i === 0) {
            canvasCtx.moveTo(x, y);
        } else {
            canvasCtx.lineTo(x, y);
        }
        x += sliceWidth;
    }

    canvasCtx.lineTo(canvas.width, canvas.height / 2);
    canvasCtx.stroke();
}

window.addEventListener('resize', resizeCanvas);
