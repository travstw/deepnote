'use strict';

const audioContext = new AudioContext();
const outputAnalyser = new AnalyserNode(audioContext);
const outputBus = new GainNode(audioContext, {gain: 0.07});
outputBus.connect(outputAnalyser);
outputBus.connect(audioContext.destination);
let systemPlaying = false;

const chordMultipliers = {
    major: [1, 2, 3, 4, 6, 8, 12, 16, 24, 32, 40.5],
    minor: [1, 2, 3, 4, 6, 8, 12, 16, 24, 32, 37.92]
}

const chordRootFrequences = {
    'A': 28,
    'A#': 29,
    'B': 31,
    'C': 33,
    'C#': 35,
    'D': 36,
    'D#': 39,
    'E': 41,
    'F': 44,
    'F#': 46,
    'G': 49
}

const WAVE_TYPES = ['sine', 'square', 'sawtooth', 'triangle'];
let frequencyGenerators;
let panGenerator; 
let oscillators = []; 

//Parameters
let root;
let chord;
let voices;
let initialFreqLow;
let initialFreqHigh;
let final_freqs;
let wave;
let length;
let rampStart;
let rampLength;
let fadeIn;
let fadeOutStart;

//DOM elements

const canvas = document.getElementById('frequencyTracks');
const drawCtx = canvas.getContext('2d');
const voicesElem = document.getElementById('voices');
const rootElem = document.getElementById('root');
const chordElem = document.getElementById('chord');
const waveElem = document.getElementById('wave');
const initialFreqLowElem = document.getElementById('initialFreqLow');
const initialFreqHighElem = document.getElementById('initialFreqHigh');
const lengthElem = document.getElementById('length');
const rampStartElem = document.getElementById('rampStart');
const rampLengthElem = document.getElementById('rampLength');
const fadeInElem = document.getElementById('fadeIn');
const fadeOutStartElem = document.getElementById('fadeOutStart');
const playButtonElem = document.getElementById('playButton');
const resetDefaultsElem = document.getElementById('resetDefaults');
const volumeElem = document.getElementById('volume');

//Event Listeners
voicesElem.addEventListener('change', () => {
    voices = voicesElem.value;
});

rootElem.addEventListener('change', () => {
    root = rootElem.value;
});

chordElem.addEventListener('change', () => {
    chord = chordElem.value;
});

initialFreqLowElem.addEventListener('change', () => {
    initialFreqLow = initialFreqLowElem.value;
});

initialFreqHighElem.addEventListener('change', () => {
    initialFreqHigh = initialFreqHighElem.value;
});

waveElem.addEventListener('change', () => {
    wave = waveElem.value;
});

lengthElem.addEventListener('change', () => {
    length = parseInt(lengthElem.value);
   
});

rampStartElem.addEventListener('change', () => {
    rampStart = parseInt(rampStartElem.value);
});

rampLengthElem.addEventListener('change', () => {
    rampLength = parseInt(rampLengthElem.value);
});

fadeInElem.addEventListener('change', () => {
    fadeIn = parseInt(fadeInElem.value);
});

fadeOutStartElem.addEventListener('change', () => {
    fadeOutStart = parseInt(fadeOutStartElem.value);
});

playButtonElem.addEventListener('click', () => {
    play();
});

resetDefaultsElem.addEventListener('click', () => {
    setDefaultParams();
});

volumeElem.addEventListener('input', (e) => {
    const fraction = parseInt(e.target.value)/ parseInt(e.target.max);
    outputBus.gain.value = fraction * fraction;
    console.log(outputBus.gain.value);
});

setDefaultParams();


function init() {
    clearSuicideTimer();
    final_freqs = buildChord(chord, chordRootFrequences[root]);
    frequencyGenerators = getFrequencyGenerators();
    panGenerator = getPanGenerator();
    oscillators = createOscillators();
}

function buildChord(chord, root) {
    return chordMultipliers[chord].map(mult => {
        return root * mult;
    });
}

function createOscillators() {
    const oscillators = [];

    for (let i = 0; i < voices; i++) {
        const finishingNote = getFrequency();
        const finishingPan = finishingNote < 300 ? 0.00001 : panGenerator.next().value;
        const finishingGain = (finishingNote > 400) ? (Math.random() * 0.4) + 0.2 : (Math.random() * 0.85) + 0.65;
        const freq = Math.floor((Math.random() * initialFreqHigh) + initialFreqLow);
        console.log(freq);
        console.log(freq > 1000 ? 5000 : freq * 5);
        let playing = false;
        
        const osc = new OscillatorNode(audioContext, {
            type: setWave(),
            frequency: freq,
            detune: finishingNote === 1458 ? (Math.random() * 20.0) - 5.0 : (Math.random() * 10.0)  - 1.0
        });

        const lp = new BiquadFilterNode(audioContext, {
            type: 'lowpass', 
            Q: 0.5,
            frequency: freq > 1000 ? 5000 : freq * 5
        });

        const gain = new GainNode(audioContext, {
            // gain: finishingGain
            gain: 0.001
        });

        const panner = new PannerNode(audioContext, {
            positionX: 0.00
            // positionX: 0.001
        });

        const detuneLfo = new OscillatorNode(audioContext, {
            type: 'sine', 
            frequency: Math.random()
        });

        const detuneLfoGain = new GainNode(audioContext, {
            gain: (Math.random() * 5)  + 1
        });

        detuneLfo.connect(detuneLfoGain)
        detuneLfoGain.connect(osc.detune);
        detuneLfo.start();

        const freqLfo = new OscillatorNode(audioContext, {
            type: 'sine', 
            frequency: Math.random() 
        });

        const freqLfoGain = new GainNode(audioContext, {
            gain: Math.random() 
        });

        freqLfo.connect(freqLfoGain);
        freqLfoGain.connect(osc.frequency);
        freqLfo.start();

        // const analyser = new AnalyserNode(audioContext, {
        //     fftSize: 256,
        //     frequencyBinCount: 128
        // });
        // let bin = new Float32Array(analyser.frequencyBinCount);

        

        osc.connect(lp)
            .connect(gain)
            .connect(panner)
            // .connect(analyser)
            .connect(outputBus);

        oscillators.push({
            osc,
            lp,
            gain,
            panner, 
            detuneLfo,
            freqLfo, 
            finishingNote, 
            finishingPan, 
            finishingGain, 
            playing: false,
        })
    }
    return oscillators;
}


function play() {
    init();

    oscillators.forEach(osc => {
        osc.gain.gain.exponentialRampToValueAtTime(osc.finishingGain, audioContext.currentTime + fadeIn);

        setTimeout(() => {
            osc.gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + (length - fadeOutStart));
        }, 1000 * fadeOutStart);
        
        setTimeout(() => {
            const fadeInTime = rampLength //+ (Math.random() + -0.2);
            osc.panner.positionX.exponentialRampToValueAtTime(osc.finishingPan, audioContext.currentTime + fadeInTime);
        }, 1000 * (rampStart + (Math.random() + -0.5)));
        
        setTimeout(() => {
            const rampInTime = rampLength //+ (Math.random() + -0.1);
            osc.osc.frequency.exponentialRampToValueAtTime(osc.finishingNote, audioContext.currentTime + rampInTime);
        }, 1000 * (rampStart + (Math.random() + -0.5)));
        
        
        osc.osc.start();
        osc.playing = true;
    });
    systemPlaying = true;
    oscSuicideTimer();
    visualize();
}

function visualize() {
    const HEIGHT = canvas.height;
    const WIDTH = canvas.width;
    let freqDomain = new Uint8Array(outputAnalyser.frequencyBinCount);
    let timeDomain = new Uint8Array(outputAnalyser.frequencyBinCount);

    (function draw() {
        if (!systemPlaying) {
            drawCtx.clearRect(0, 0, WIDTH, HEIGHT);
            return;
        }
        
        drawCtx.clearRect(0, 0, WIDTH, HEIGHT);
        // freq Domain
        requestAnimationFrame(draw);
        outputAnalyser.getByteFrequencyData(freqDomain);
        for (let i = 0; i < outputAnalyser.frequencyBinCount; i++) {
            let value = freqDomain[i];
            let percent = value / 256;
            let height = HEIGHT * percent;
            let offset = HEIGHT - height - 1;
            let barWidth = (WIDTH/outputAnalyser.frequencyBinCount) * 1.75;
            let hue = i/outputAnalyser.frequencyBinCount * 360;
            // drawCtx.fillStyle = 'hsl(' + hue + ', 100%, 50%)';
            drawCtx.fillStyle = '#9CC7F5';
            drawCtx.fillRect(i * barWidth, offset, barWidth, height);
        }

        outputAnalyser.getByteTimeDomainData(timeDomain);
        for (var i = 0; i < outputAnalyser.frequencyBinCount; i++) {
            var value = timeDomain[i];
            var percent = (value / 256);
            var height = HEIGHT * percent;
            var offset = HEIGHT - height;
            var barWidth = WIDTH/outputAnalyser.frequencyBinCount;
            drawCtx.fillStyle = '#f2f2f2';
            drawCtx.fillRect(i * barWidth, offset, 1, 1);
        }
    })();

}

function getFrequencyGenerators() {
    const numPerFrequency = voices / final_freqs.length;
    const generators = final_freqs.map(freq => {
        return (function* () {
            for (let i = 0; i < numPerFrequency; i++) {
                yield freq;
            }
        })();
    });

    return generators;
}


function getFrequency() {
    const frequencies = frequencyGenerators.slice();

    let freq = null;

    while (!freq && frequencies.length) {
        const nextFrequency = frequencies.pop().next();
        if (nextFrequency.value) {
            freq = nextFrequency.value;
            break;
        }
    }
    return freq;
}

function getPanGenerator() {
    let pan = -1.0;
    return (function* () {
        for (let i = 0; i < 100; i++) {
            pan = pan * -1;
            yield pan;
        }
       
    })();
}

function setDefaultParams() {
    voices = 33;
    root = 'D';
    rootElem.value = 'D';
    chord = 'major';
    chordElem.value = 'major';
    voicesElem.value = 33;
    initialFreqLow = 200;
    initialFreqLowElem.value = 200;
    initialFreqHigh = 400;
    initialFreqHighElem.value = 400;
    wave = 'sawtooth';
    waveElem.value = 'sawtooth';
    length = 30;
    lengthElem.value = 30;
    rampStart = 13;
    rampStartElem.value = 13;
    rampLength = 5;
    rampLengthElem.value = 5;
    fadeIn = 14;
    fadeInElem.value = 14;
    fadeOutStart = 26;
    fadeOutStartElem.value = 26;
}

function setWave() {
    if (wave === 'multi') {
        const index = Math.floor(Math.random() * WAVE_TYPES.length);
        return WAVE_TYPES[index];
    }   
    return wave;
}

function stop() {
    oscillators.forEach(osc => {
        if (osc.playing) {
            osc.playing = false;
            osc.osc.stop();
        }
    });
}


// Stops oscillators after length + 1 seconds
let suicideTimer;
function oscSuicideTimer() {
    suicideTimer = setTimeout(() => {
        stop();
        systemPlaying = false;
    }, 1000 * (length + 1));
}

function clearSuicideTimer() {
    clearTimeout(suicideTimer);
}

