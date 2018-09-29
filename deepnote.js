'use strict';

const audioContext = new AudioContext();
const WAVE_TYPES = ['sine', 'square', 'sawtooth', 'triangle'];
let frequencyGenerators;
let panGenerator; 
let oscillators = []; 

//Parameters
let voices = 30;
let initialFreqLow = 200;
let initialFreqHigh = 400;
let final_freqs = [72, 144, 288, 576, 1152, 108, 216, 432, 864, 1458];
let wave = 'sawtooth';


//DOM elements
const playButtonElem = document.getElementById('playButton');
const initialFreqLowElem = document.getElementById('initialFreqLow');
const initialFreqHighElem = document.getElementById('initialFreqHigh');
const voicesElem = document.getElementById('voices');
const waveElem= document.getElementById('wave');

//Event Listeners
playButtonElem.addEventListener('click', () => {
    play();
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
    console.log(wave);
})




function init() {
    oscillators.forEach(osc => {
        if (osc.playing) {
            osc.playing = false;
            osc.osc.stop();
        }
    });
    
    frequencyGenerators = getFrequencyGenerators();
    panGenerator = getPanGenerator();
    oscillators = createOscillators();
}

function createOscillators() {
    
    const oscillators = [];

    for (let i = 0; i < voices; i++) {
        const finishingNote = getFrequency();
        const finishingPan = finishingNote < 300 ? 0.0 : panGenerator.next().value;
        const finishingGain = (finishingNote > 864) ? (Math.random() * 0.4) + 0.2 : (Math.random() * 0.85) + 0.65 ;
        const freq = Math.floor((Math.random() * initialFreqHigh) + initialFreqLow);
        let playing = false;
        
        const osc = new OscillatorNode(audioContext, {
            type: setWave(),
            frequency: freq,
            detune: finishingNote === 1458 ? Math.floor((Math.random() * 10) + 1) : 0
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
            positionX: 0.0
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
        osc.gain.gain.exponentialRampToValueAtTime(osc.finishingGain, audioContext.currentTime + 12);
        const fadeoutStart = audioContext.currentTime + 24;
        osc.gain.gain.setTargetAtTime(0.0001, fadeoutStart, 1.0);

        const pannerStart = audioContext.currentTime + 10;
        const pannerTime = (Math.random() * 0.85) + 0.75;
        osc.panner.positionX.setTargetAtTime(osc.finishingPan, pannerStart, pannerTime);

        const pitchStart = audioContext.currentTime + 10;
        const pitchTime = (Math.random() * 0.85) + 0.75;
        osc.osc.frequency.setTargetAtTime(osc.finishingNote,  pitchStart, pitchTime);
    
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

function setWave() {
    if (wave === 'multi') {
        const index = Math.floor(Math.random() * WAVE_TYPES.length);
        return WAVE_TYPES[index];
    }   
    return wave;
}