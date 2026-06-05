const pitchDisplay = document.getElementById('pitch-display');
const noteDisplay = document.getElementById('note-display');
const startBtn = document.getElementById('start-btn');

let audioContext, analyser, microphone, scriptNode;
let aubioInstance = null; // Store the initialized instance
let aubioPitch = null;
let isRunning = false;

const noteStrings = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

startBtn.addEventListener('click', async () => {
    if (isRunning) return;
    startBtn.disabled = true;
    startBtn.innerText = "Initializing...";

    try {
        // 1. WAIT for the WASM module to load and initialize
        // The global function is 'aubiojs', not 'aubio'
        if (typeof aubio === 'undefined') {
            throw new Error("aubiojs library not loaded.");
        }

        noteDisplay.innerText = "Loading WASM module...";
        aubioInstance = await aubio(); // <--- Crucial Step
        noteDisplay.innerText = "Module loaded. Requesting Mic...";

        // 2. Setup Audio Context
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const sampleRate = audioContext.sampleRate;
        const bufferSize = 4096; // increase the buffer for potentially better results.
        const hopSize = bufferSize / 2;

        // 3. Create Pitch Detector FROM THE INSTANCE
        // Syntax: new instance.Pitch(method, bufferSize, hopSize, sampleRate)
        aubioPitch = new aubioInstance.Pitch("yinfft", bufferSize, hopSize, sampleRate);
        // aubioPitch.set_tolerance(0.08);

        // 4. Get Microphone Access
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        microphone = audioContext.createMediaStreamSource(stream);

        // 5. Setup Processing Node
        scriptNode = audioContext.createScriptProcessor(bufferSize, 1, 1);
        microphone.connect(scriptNode);
        scriptNode.connect(audioContext.destination);

        // 6. Process Audio
        scriptNode.onaudioprocess = function(event) {
            const inputBuffer = event.inputBuffer.getChannelData(0);

            // Create vector FROM THE INSTANCE
            // const vector = new aubioInstance.fvec(hopSize);

            // Copy data
            // for (let i = 0; i < hopSize; i++) {
                // vector.data[i] = inputBuffer[i];
            // }

            // Detect pitch
            // const frequency = aubioPitch.do(vector);

            // Create a standard Float32Array slice of input
            const slice = inputBuffer.slice(0, hopSize);

            // Pass the Float32Array directly to .do()
            const frequency = aubioPitch.do(slice);

            if (frequency > 0) {
                pitchDisplay.innerText = frequency.toFixed(2) + " Hz";
                noteDisplay.innerText = frequencyToNote(frequency);
                noteDisplay.classList.remove('error');
            } else {
                pitchDisplay.innerText = "-- Hz";
                noteDisplay.innerText = "Silence or Noise";
            }

            vector.delete(); // Clean up WASM memory
        };

        isRunning = true;
        startBtn.innerText = "Listening...";

    } catch (err) {
        console.error(err);
        noteDisplay.innerText = "Error: " + err.message;
        noteDisplay.classList.add('error');
        startBtn.disabled = false;
        startBtn.innerText = "Retry";
    }
});

function frequencyToNote(freq) {
    const noteNum = 12 * (Math.log(freq / 440) / Math.log(2));
    const roundedNote = Math.round(noteNum) + 69;
    const noteName = noteStrings[roundedNote % 12];
    const octave = Math.floor(roundedNote / 12) - 1;
    return `${noteName}${octave}`;
}
