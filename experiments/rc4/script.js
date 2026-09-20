// Navigation Logic
document.addEventListener("DOMContentLoaded", () => {
    const navBtns = document.querySelectorAll(".nav-btn");
    const sections = document.querySelectorAll(".content-section");

    navBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            // Remove active class from all
            navBtns.forEach(b => b.classList.remove("active"));
            sections.forEach(s => s.classList.remove("active"));

            // Add active class to clicked
            btn.classList.add("active");
            const targetId = btn.getAttribute("data-target");
            document.getElementById(targetId).classList.add("active");
        });
    });

    // Initialize Simulation
    initSimulation();

    // Initialize Quiz
    initQuiz();
});

/* ========================================================
   RC4 Core Implementation & Simulation Logic
======================================================== */
let S = [];
let K = [];
let T = [];
let key = "";
let ksa_i = 0;
let ksa_j = 0;
let ksa_completed = false;

// UI Elements
const gridContainer = document.getElementById("state-grid");
const statusText = document.getElementById("status-text");
const valI = document.getElementById("val-i");
const valJ = document.getElementById("val-j");

function initGrid() {
    gridContainer.innerHTML = "";
    S = [];
    for (let i = 0; i < 256; i++) {
        S.push(i);
        const cell = document.createElement("div");
        cell.className = "grid-cell";
        cell.id = `cell-${i}`;
        // Output as Hex to keep it uniformly 2 characters
        cell.textContent = ('0' + i.toString(16).toUpperCase()).slice(-2);
        gridContainer.appendChild(cell);
    }
}

function updateCell(index, stateClass = null) {
    const cell = document.getElementById(`cell-${index}`);
    if (!cell) return;
    cell.className = "grid-cell " + (stateClass ? stateClass : "");
    cell.textContent = ('0' + S[index].toString(16).toUpperCase()).slice(-2);
}

function clearCellHighlights() {
    for (let i = 0; i < 256; i++) {
        const cell = document.getElementById(`cell-${i}`);
        if (cell) cell.className = "grid-cell";
    }
}

function resetSimulation() {
    initGrid();
    ksa_i = 0;
    ksa_j = 0;
    ksa_completed = false;
    valI.textContent = "0";
    valJ.textContent = "0";
    statusText.textContent = "Ready to start KSA.";
    document.getElementById("prga-panel").style.opacity = "0.5";
    document.getElementById("prga-panel").style.pointerEvents = "none";
    document.getElementById("btn-encrypt").disabled = true;
    document.getElementById("btn-decrypt").disabled = true;
    document.getElementById("sim-output").value = "";
    document.getElementById("generated-keystream").textContent = "--";
    document.getElementById("btn-ksa-run").disabled = false;
    document.getElementById("btn-ksa-step").disabled = false;
}

function initializeKeyArray() {
    key = document.getElementById("sim-key").value;
    if (key.length === 0) {
        alert("Please enter a key.");
        return false;
    }
    K = [];
    T = [];
    for (let i = 0; i < key.length; i++) {
        K.push(key.charCodeAt(i));
    }
    for (let i = 0; i < 256; i++) {
        T[i] = K[i % K.length];
    }
    return true;
}

function doKsaStep() {
    if (ksa_i === 0 && !initializeKeyArray()) return false;

    if (ksa_i < 256) {
        clearCellHighlights();
        ksa_j = (ksa_j + S[ksa_i] + T[ksa_i]) % 256;

        // Visual updates
        updateCell(ksa_i, "cell-i");
        updateCell(ksa_j, "cell-j");
        valI.textContent = ksa_i;
        valJ.textContent = ksa_j;

        // Swap
        let temp = S[ksa_i];
        S[ksa_i] = S[ksa_j];
        S[ksa_j] = temp;

        // Update DOM with new values and swap classes
        setTimeout(() => {
            updateCell(ksa_i, "cell-swap");
            updateCell(ksa_j, "cell-swap");
        }, 150); // small delay to visualize swap

        ksa_i++;
        return true; // Still running
    } else {
        completeKSA();
        return false; // Done
    }
}

function completeKSA() {
    ksa_completed = true;
    clearCellHighlights();
    statusText.textContent = "KSA Completed. Ready for Encryption/Decryption.";
    document.getElementById("prga-panel").style.opacity = "1";
    document.getElementById("prga-panel").style.pointerEvents = "auto";
    document.getElementById("btn-encrypt").disabled = false;
    document.getElementById("btn-decrypt").disabled = false;
    document.getElementById("btn-ksa-run").disabled = true;
    document.getElementById("btn-ksa-step").disabled = true;
}

let runningFullKsa = false;
function runFullKsa() {
    if (!initializeKeyArray()) return;
    document.getElementById("btn-ksa-run").disabled = true;
    document.getElementById("btn-ksa-step").disabled = true;
    statusText.textContent = "Running KSA Instantly...";

    // Compute purely in JS, no animation
    S = [];
    for (let i = 0; i < 256; i++) S.push(i);
    let j = 0;
    for (let i = 0; i < 256; i++) {
        j = (j + S[i] + T[i]) % 256;
        let temp = S[i];
        S[i] = S[j];
        S[j] = temp;
    }

    // Update grid once
    for (let i = 0; i < 256; i++) updateCell(i);

    ksa_i = 256;
    ksa_j = j;
    completeKSA();
}

// PRGA Logic
function generateRc4(text, isDecryptHex = false) {
    if (!ksa_completed) return;

    let prga_i = 0;
    let prga_j = 0;

    // We must clone S so that subsequent encrypt operations don't pick up from where PRGA left off,
    // (Standard RC4 retains state, but for this lab, we should reset PRGA state for each encryption of full text for simplicity and correctness)
    let S_clone = [...S];

    let inputBytes = [];
    if (isDecryptHex) {
        text = text.replace(/\s/g, ''); // remove spaces
        for (let c = 0; c < text.length; c += 2) {
            inputBytes.push(parseInt(text.substr(c, 2), 16));
        }
    } else {
        for (let c = 0; c < text.length; c++) {
            inputBytes.push(text.charCodeAt(c));
        }
    }

    let outputBytes = [];
    let keystreamHex = [];

    for (let k = 0; k < inputBytes.length; k++) {
        prga_i = (prga_i + 1) % 256;
        prga_j = (prga_j + S_clone[prga_i]) % 256;

        let temp = S_clone[prga_i];
        S_clone[prga_i] = S_clone[prga_j];
        S_clone[prga_j] = temp;

        let t = (S_clone[prga_i] + S_clone[prga_j]) % 256;
        let keystreamByte = S_clone[t];

        keystreamHex.push(('0' + keystreamByte.toString(16).toUpperCase()).slice(-2));

        let outByte = inputBytes[k] ^ keystreamByte;
        outputBytes.push(outByte);
    }

    document.getElementById("generated-keystream").textContent = keystreamHex.join(" ");

    let result = "";
    if (isDecryptHex) {
        // Output as string
        for (let i = 0; i < outputBytes.length; i++) {
            result += String.fromCharCode(outputBytes[i]);
        }
    } else {
        // Output as hex
        for (let i = 0; i < outputBytes.length; i++) {
            result += ('0' + outputBytes[i].toString(16).toUpperCase()).slice(-2) + " ";
        }
    }
    document.getElementById("sim-output").value = result.trim();
}

function initSimulation() {
    initGrid();

    document.getElementById("btn-reset").addEventListener("click", resetSimulation);

    document.getElementById("btn-ksa-run").addEventListener("click", runFullKsa);

    document.getElementById("btn-ksa-step").addEventListener("click", () => {
        doKsaStep();
    });

    document.getElementById("btn-encrypt").addEventListener("click", () => {
        const text = document.getElementById("sim-plaintext").value;
        if (text) generateRc4(text, false);
    });

    document.getElementById("btn-decrypt").addEventListener("click", () => {
        const text = document.getElementById("sim-plaintext").value;
        if (text) generateRc4(text, true);
    });
}


/* ========================================================
   Quiz Logic
======================================================== */
const quizQuestions = [
    {
        question: "What is the size of the state array 'S' initialized in RC4?",
        options: ["128 Bytes", "256 Bytes", "64 Bytes", "512 Bytes"],
        answer: 1 // index 1 is "256 Bytes"
    },
    {
        question: "Is RC4 a block cipher or a stream cipher?",
        options: ["Block Cipher", "Stream Cipher", "Hash Function", "Asymmetric Cipher"],
        answer: 1
    },
    {
        question: "In the KSA phase, how many iterations does the swap loop execute?",
        options: ["64", "128", "256", "It depends on the key length"],
        answer: 2
    },
    {
        question: "What mathematical operation is used in RC4 to generate ciphertext from plaintext and keystream?",
        options: ["AND", "OR", "XOR", "NOT"],
        answer: 2
    },
    {
        question: "Who designed the RC4 algorithm?",
        options: ["Bruce Schneier", "Ron Rivest", "Whitfield Diffie", "Martin Hellman"],
        answer: 1
    },
    {
        question: "In which wireless protocol is RC4 most notoriously used?",
        options: ["WPA3", "IPsec", "WEP", "SSH"],
        answer: 2
    },
    {
        question: "What is the typical variable key length allowed by RC4?",
        options: ["Exactly 128 bytes", "Fixed 256 bits", "1 to 256 bytes", "Unlimited"],
        answer: 2
    },
    {
        question: "In the KSA phase, the secondary array T is initialized using:",
        options: ["The keystream", "The provided key", "Random numbers", "Only zeros"],
        answer: 1
    }
];

function initQuiz() {
    const quizContainer = document.getElementById("quiz-container");

    quizQuestions.forEach((q, index) => {
        const qDiv = document.createElement("div");
        qDiv.className = "quiz-question";

        const qTitle = document.createElement("h4");
        qTitle.textContent = `${index + 1}. ${q.question}`;
        qDiv.appendChild(qTitle);

        const optionsList = document.createElement("ul");
        optionsList.className = "quiz-options";

        q.options.forEach((opt, optIndex) => {
            const li = document.createElement("li");
            const label = document.createElement("label");
            const radio = document.createElement("input");

            radio.type = "radio";
            radio.name = `question${index}`;
            radio.value = optIndex;

            label.appendChild(radio);
            label.appendChild(document.createTextNode(opt));
            li.appendChild(label);
            optionsList.appendChild(li);
        });

        qDiv.appendChild(optionsList);

        // Add feedback div
        const feedbackDiv = document.createElement("div");
        feedbackDiv.className = "question-feedback hidden";
        qDiv.appendChild(feedbackDiv);

        quizContainer.appendChild(qDiv);
    });

    document.getElementById("btn-submit-quiz").addEventListener("click", ev => {
        let score = 0;
        let allAnswered = true;

        // Verify if all questions are answered
        quizQuestions.forEach((q, index) => {
            const selected = document.querySelector(`input[name="question${index}"]:checked`);
            if (!selected) {
                allAnswered = false;
            }
        });

        const resDiv = document.getElementById("quiz-result");
        if (!allAnswered) {
            resDiv.className = "quiz-result";
            resDiv.style.backgroundColor = "#fff3cd";
            resDiv.style.color = "#856404";
            resDiv.textContent = "Please answer all questions before submitting.";
            return;
        }

        const qDivs = document.querySelectorAll(".quiz-question");

        quizQuestions.forEach((q, index) => {
            const selected = document.querySelector(`input[name="question${index}"]:checked`);
            const feedbackDiv = qDivs[index].querySelector(".question-feedback");
            feedbackDiv.classList.remove("hidden");

            if (parseInt(selected.value) === q.answer) {
                score++;
                feedbackDiv.textContent = "Correct!";
                feedbackDiv.style.color = "green";
                feedbackDiv.style.backgroundColor = "#d4edda";
            } else {
                feedbackDiv.innerHTML = `Incorrect. The correct answer is: <strong>${q.options[q.answer]}</strong>`;
                feedbackDiv.style.color = "#721c24";
                feedbackDiv.style.backgroundColor = "#f8d7da";
            }
        });

        resDiv.className = "quiz-result success";
        resDiv.style.backgroundColor = ""; // let css handle success state
        resDiv.style.color = "";
        resDiv.textContent = `You scored ${score} out of ${quizQuestions.length}!`;
    });
}
