const audioContext = new AudioContext();
const oscList = [];
let mainGainNode = null;
const keyboard = document.querySelector(".keyboard");
const keyInp = document.querySelector("input[name='keyInp']");
const wavePicker = document.querySelector("select[name='waveform']");
const octaveControl = document.querySelector("input[name='octave']");
const volumeControl = document.querySelector("input[name='volume']");
const specFreq = document.querySelector("input[name='specFreq']");
const playSpecFreq = document.querySelector("input[name='playSpecFreq']");
const freqOutput = document.querySelector(".frequencies");
let customWaveform = null;
let sineTerms = null;
let cosineTerms = null;
let octaveNum = octaveControl.value;
function createNoteTable() {
  const noteFreq = [
    { A: 27.5, "A#": 29.13523509488062, B: 30.867706328507754 },
    {
      C: 32.70319566257483,
      "C#": 34.64782887210901,
      D: 36.70809598967595,
      "D#": 38.89087296526011,
      E: 41.20344461410874,
      F: 43.65352892912549,
      "F#": 46.2493028389543,
      G: 48.99942949771866,
      "G#": 51.91308719749314,
      A: 55,
      "A#": 58.27047018976124,
      B: 61.73541265701551,
    },
  ];
  for (let octave = 2; octave <= 7; octave++) {
    noteFreq.push(
      Object.fromEntries(
        Object.entries(noteFreq[octave - 1]).map(([key, freq]) => [
          key,
          freq * 2,
        ]),
      ),
    );
  }
  noteFreq.push({ C: 4186.009044809578 });
  return noteFreq;
}
function setup() {
  const noteFreq = createNoteTable();

  volumeControl.addEventListener("change", changeVolume);
  octaveControl.addEventListener("change", (evt) => {octaveNum = evt.target.value});
  playSpecFreq.addEventListener("mousedown", () => {
    noteReleased(null, true);
    oscList[0]["specFreq"] = playTone(specFreq.value);
  });
  playSpecFreq.addEventListener("pointerdown", () => {
    noteReleased(null, true);
    oscList[0]["specFreq"] = playTone(specFreq.value);
  });
  playSpecFreq.addEventListener("keydown", () => {
    if (event.repeat) {
      return;
    }
    noteReleased(null, true);
    oscList[0]["specFreq"] = playTone(specFreq.value);
  });
  
  playSpecFreq.addEventListener("mouseup", () => {
    noteReleased(null, true);
  });
  playSpecFreq.addEventListener("pointerup", () => {
    noteReleased(null, true);
  });
  playSpecFreq.addEventListener("keyup", () => {
    noteReleased(null, true);
  });



  mainGainNode = audioContext.createGain();
  mainGainNode.connect(audioContext.destination);
  mainGainNode.gain.value = volumeControl.value;

  // Create the keys; skip any that are sharp or flat; for
  // our purposes we don't need them. Each octave is inserted
  // into a <div> of class "octave".

  noteFreq.forEach((keys, idx) => {
    const keyList = Object.entries(keys);
    const octaveElem = document.createElement("div");
    octaveElem.className = "octave";

    keyList.forEach((key) => {
      if (key[0].length >= 1) { // change to === for only natural notes
        octaveElem.appendChild(createKey(key[0], idx, key[1]));
      }
    });

    keyboard.appendChild(octaveElem);
  });

  /*document
    .querySelector("div[data-note='B'][data-octave='5']")
    .scrollIntoView(false);*/

  sineTerms = new Float32Array([0, 0, 1, 0, 1]);
  cosineTerms = new Float32Array(sineTerms.length);
  customWaveform = audioContext.createPeriodicWave(cosineTerms, sineTerms);

  for (let i = 0; i < 9; i++) {
    oscList[i] = {};
  }
}

setup();
function createKey(note, octave, freq) {
  const keyElement = document.createElement("div");
  const labelElement = document.createElement("div");

  keyElement.className = "key";
  keyElement.dataset["octave"] = octave;
  keyElement.dataset["note"] = note;
  keyElement.dataset["frequency"] = freq;
  labelElement.appendChild(document.createTextNode(note));
  labelElement.appendChild(document.createElement("sub")).textContent = octave;
  keyElement.appendChild(labelElement);

  keyElement.addEventListener("mousedown", notePressed);
  keyElement.addEventListener("mouseup", noteReleased);
  keyElement.addEventListener("mouseover", notePressed);
  keyElement.addEventListener("mouseleave", noteReleased);

  keyElement.addEventListener("pointerdown", notePressed);
  keyElement.addEventListener("pointerup", noteReleased);
  //keyElement.addEventListener("pointermove", notePressed);
  //keyElement.addEventListener("pointercancel", noteReleased);

  return keyElement;
}
function playTone(freq) {
  const osc = audioContext.createOscillator();
  osc.gainNode = audioContext.createGain();
  osc.connect(osc.gainNode);
  osc.gainNode.connect(mainGainNode);

  const type = wavePicker.options[wavePicker.selectedIndex].value;

  if (type === "custom") {
    osc.setPeriodicWave(customWaveform);
  } else {
    osc.type = type;
  }

  osc.frequency.value = freq;


  const now = audioContext.currentTime;
  osc.gainNode.gain.setValueAtTime(0.001, now);
  osc.start(now);
  // Ramp to full volume over 0.05 seconds (50ms)
  osc.gainNode.gain.exponentialRampToValueAtTime(1, now + 0.05);


  return osc;
}
function notePressed(event) {
  if (event.buttons & 1) {
    const dataset = event.target.dataset;

    if (!dataset["pressed"] && dataset["octave"]) {
      const octave = Number(dataset["octave"]);
      oscList[octave][dataset["note"]] = playTone(dataset["frequency"]);
      dataset["pressed"] = "yes";

    }
  }
  showFrequencies();
}
function noteReleased(event, specialFreq=false) {
  let dataset;
  if (specialFreq === true) {
    dataset = {"pressed": "yes", "octave": "0", "note": "specFreq"};
  } else {
    dataset = event.target.dataset;
  }

  if (dataset && dataset["pressed"]) {
    const octave = Number(dataset["octave"]);

    if (oscList[octave] && oscList[octave][dataset["note"]]) {
      let osc = oscList[octave][dataset["note"]];
      const now = audioContext.currentTime;
      // 4. Apply Release (Fade Out)
      // Begin ramping down before the sound ends
      // We ramp to 0.001 instead of 0 because exponentialRamp cannot reach 0 mathematically
      osc.gainNode.gain.setValueAtTime(1, now);
      osc.gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
      oscList[octave][dataset["note"]].stop(now + 0.055);
      delete oscList[octave][dataset["note"]];
      delete dataset["pressed"];
    }
  }
  showFrequencies();
}
function showFrequencies() {
  let pressedNotes = keyboard.querySelectorAll(".key[data-pressed='yes']");
  let notes = [];
  pressedNotes.forEach((key) => {
    let freq = key.dataset["frequency"];
    freq = parseFloat(parseFloat(freq).toFixed(2));
    notes.push(freq);
  });
  freqOutput.innerText = "Frequencies: " + JSON.stringify(notes).slice(1, -1).replaceAll(",", ", ");
}
function changeVolume(event) {
  mainGainNode.gain.value = volumeControl.value;
}
const synthKeys = document.querySelectorAll(".key");
// prettier-ignore
// const keyCodes = [
//   "Space",
//   "ShiftLeft", "KeyZ", "KeyX", "KeyC", "KeyV", "KeyB", "KeyN", "KeyM", "Comma", "Period", "Slash", "ShiftRight",
//   "KeyA", "KeyS", "KeyD", "KeyF", "KeyG", "KeyH", "KeyJ", "KeyK", "KeyL", "Semicolon", "Quote", "Enter",
//   "Tab", "KeyQ", "KeyW", "KeyE", "KeyR", "KeyT", "KeyY", "KeyU", "KeyI", "KeyO", "KeyP", "BracketLeft", "BracketRight",
//   "Digit1", "Digit2", "Digit3", "Digit4", "Digit5", "Digit6", "Digit7", "Digit8", "Digit9", "Digit0", "Minus", "Equal", "Backspace",
//   "Escape",
// ];
const keyCodes = [
  "Backquote", "Digit1", "KeyA", "KeyZ", "KeyS", "KeyX", "KeyD", "KeyC", "KeyV", "KeyG", "KeyB", "KeyH", "KeyN", "KeyJ", "KeyM", "Comma", "KeyL", "Period", "Semicolon", "Slash",
  "KeyQ", "Digit2", "KeyW", "Digit3", "KeyE", "Digit4", "KeyR", "KeyT", "Digit6", "KeyY", "Digit7", "KeyU", "KeyI", "Digit9", "KeyO", "Digit0", "KeyP", "Minus", "BracketLeft", "BracketRight", "Backspace", "Backslash"
];
function keyNote(event) {

  keyInp.value = "";
  let noteNum = keyCodes.indexOf(event.code);
  if (noteNum === -1) {
    return;
  }
  // console.log(noteNum);
  noteNum = (noteNum >= -1) ? noteNum + (12 * octaveNum):noteNum;
  const elKey = synthKeys[noteNum];
  if (elKey && noteNum >= 0) {
    if (event.type === "keydown") {
      // elKey.tabIndex = -1;
      // elKey.focus();
      elKey.classList.add("active");
      notePressed({ buttons: 1, target: elKey });
    } else {
      elKey.classList.remove("active");
      noteReleased({ buttons: 1, target: elKey });
    }
    event.preventDefault();
  }
}
keyInp.addEventListener("keydown", keyNote);
keyInp.addEventListener("keyup", keyNote);

