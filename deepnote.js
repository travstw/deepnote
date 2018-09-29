'use strict';

const audioContext = new AudioContext();
const outputBus = new GainNode(audioContext, {gain: 0.25});
outputBus.connect(audioContext.destination);

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
});

setDefaultParams();


function init() {
    stop();
    final_freqs = buildChord(chord, chordRootFrequences[root]);
    console.log(final_freqs);
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
        let playing = false;
        
        const osc = new OscillatorNode(audioContext, {
            type: setWave(),
            frequency: freq,
            detune: finishingNote === 1458 ? Math.floor((Math.random() * 20) + 1) : 0
        });

        const lp = new BiquadFilterNode(audioContext, {
            type: 'lowpass', 
            Q: 0.5,
            frequency: freq * 5
        });

        const gain = new GainNode(audioContext, {
            // gain: finishingGain
            gain: 0.001
        })

        const panner = new PannerNode(audioContext, {
            positionX: 0.00
            // positionX: 0.001
        });

        const lfo = new OscillatorNode(audioContext, {
            type: 'sine', 
            frequency: Math.random() * 1 
        });

        const lfoGain = new GainNode(audioContext, {
            gain: (Math.random() * 5)  + 1 
        });

        const analyser = new AnalyserNode(audioContext);

        lfo.connect(lfoGain)
        lfoGain.connect(osc.detune);
        lfo.start();

        osc.connect(lp)
            .connect(gain)
            .connect(panner)
            .connect(analyser)
            .connect(outputBus);

        oscillators.push({
            osc,
            lp,
            gain,
            panner, 
            lfo, 
            finishingNote, 
            finishingPan, 
            finishingGain, 
            analyser, 
            playing: false
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
            const fadeInTime = rampLength + ((Math.random() * 1) + -0.5);
            osc.panner.positionX.exponentialRampToValueAtTime(osc.finishingPan, audioContext.currentTime + fadeInTime);
        }, 1000 * rampStart);
        
        setTimeout(() => {
            const rampInTime = rampLength + ((Math.random() * 1) + -0.5);
            osc.osc.frequency.exponentialRampToValueAtTime(osc.finishingNote, audioContext.currentTime + rampInTime);
        }, 1000 * rampStart);
        
        osc.osc.start();
        osc.playing = true;
        
    });
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

