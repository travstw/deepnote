'use strict';

const audioContext = new AudioContext();
const WAVE_TYPES = ['sine', 'square', 'sawtooth', 'triangle'];
let frequencyGenerators;
let panGenerator; 
let oscillators = []; 

//Parameters
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
const playButtonElem = document.getElementById('playButton');
const resetDefaultsElem = document.getElementById('resetDefaults');
const initialFreqLowElem = document.getElementById('initialFreqLow');
const initialFreqHighElem = document.getElementById('initialFreqHigh');
const voicesElem = document.getElementById('voices');
const waveElem = document.getElementById('wave');
const lengthElem = document.getElementById('length');
const rampStartElem = document.getElementById('rampStart');
const rampLengthElem = document.getElementById('rampLength');
const fadeInElem = document.getElementById('fadeIn');
const fadeOutStartElem = document.getElementById('fadeOutStart');

//Event Listeners
playButtonElem.addEventListener('click', () => {
    play();
});

resetDefaultsElem.addEventListener('click', () => {
    setDefaultParams();
});

initialFreqLowElem.addEventListener('change', () => {
    initialFreqLow = initialFreqLowElem.value;
});

initialFreqHighElem.addEventListener('change', () => {
    initialFreqHigh = initialFreqHighElem.value;
});

voicesElem.addEventListener('change', () => {
    voices = voicesElem.value;
});

waveElem.addEventListener('change', () => {
    wave = waveElem.value;
});

lengthElem.addEventListener('change', () => {
    length = parseInt(lengthElem.value);
   
});

rampStartElem.addEventListener('change', () => {
    rampStart = parseInt(rampStartElem.value);
    console.log(rampStart);
});

rampLengthElem.addEventListener('change', () => {
    rampLength = parseInt(rampLengthElem.value);
    console.log(rampLength);
});

fadeInElem.addEventListener('change', () => {
    fadeIn = parseInt(fadeInElem.value);
    console.log(fadeIn);
});

fadeOutStartElem.addEventListener('change', () => {
    fadeOutStart = parseInt(fadeOutStartElem.value);
    console.log(fadeOutStart);
});


setDefaultParams();


function init() {
    stop();
    frequencyGenerators = getFrequencyGenerators();
    panGenerator = getPanGenerator();
    oscillators = createOscillators();
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
            .connect(audioContext.destination);

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
    voices = 30;
    voicesElem.value = 30;
    initialFreqLow = 200;
    initialFreqLowElem.value = 200;
    initialFreqHigh = 400;
    initialFreqHighElem.value = 400;
    final_freqs = [72, 144, 288, 576, 1152, 108, 216, 432, 864, 1458];
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

