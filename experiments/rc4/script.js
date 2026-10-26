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
    document.getElementById("btn-ksa-run").disabled = false;
    document.getElementById("btn-ksa-step").disabled = false;
    resetPrga();
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
        }, 150);

        ksa_i++;
        return true;
    } else {
        completeKSA();
        return false;
    }
}

function completeKSA() {
    ksa_completed = true;
    clearCellHighlights();
    statusText.textContent = "KSA Completed. State array S is now fully permuted. Ready for PRGA.";
    document.getElementById("prga-panel").style.opacity = "1";
    document.getElementById("prga-panel").style.pointerEvents = "auto";
    document.getElementById("btn-ksa-run").disabled = true;
    document.getElementById("btn-ksa-step").disabled = true;
    resetPrga();
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

/* ========================================================
   Step-by-Step PRGA Keystream Logic & Trace Table
======================================================== */
let prga_S = [];
let prga_i = 0;
let prga_j = 0;
let prga_step_index = 0;
let prga_input_bytes = [];
let prga_keystream_bytes = [];
let prga_output_bytes = [];
let prga_is_decrypt = false;
let prga_raw_text = "";

function resetPrga() {
    prga_S = [...S];
    prga_i = 0;
    prga_j = 0;
    prga_step_index = 0;
    prga_input_bytes = [];
    prga_keystream_bytes = [];
    prga_output_bytes = [];
    prga_raw_text = "";

    if (ksa_completed) {
        for (let idx = 0; idx < 256; idx++) {
            updateCell(idx);
        }
        clearCellHighlights();
        document.getElementById("btn-prga-step").disabled = false;
        document.getElementById("btn-encrypt").disabled = false;
        document.getElementById("btn-decrypt").disabled = false;
        document.getElementById("btn-prga-reset").disabled = false;
    } else {
        document.getElementById("btn-prga-step").disabled = true;
        document.getElementById("btn-encrypt").disabled = true;
        document.getElementById("btn-decrypt").disabled = true;
        document.getElementById("btn-prga-reset").disabled = true;
    }

    const outLabel = document.getElementById("output-label");
    if (outLabel) outLabel.textContent = "Ciphertext (Letters A–P):";
    document.getElementById("generated-keystream").textContent = "--";
    document.getElementById("sim-output").value = "";
    document.getElementById("prga-byte-idx").textContent = "—";
    document.getElementById("prga-val-i").textContent = "0";
    document.getElementById("prga-val-j").textContent = "0";
    document.getElementById("prga-val-t").textContent = "—";
    document.getElementById("prga-val-k").textContent = "—";
    document.getElementById("prga-math-formula").innerHTML = 'Click <strong>"Step PRGA"</strong> to generate the keystream byte by byte and see each calculation.';
    document.getElementById("prga-trace-tbody").innerHTML = `<tr class="prga-table-empty"><td colspan="9">No keystream generated yet — click <strong>Step PRGA</strong> or <strong>Encrypt All</strong>.</td></tr>`;
}

// Hex to Letters conversion (0->A, 1->B, ..., 9->J, A->K, ..., F->P)
function nibbleToLetter(nibble) {
    return String.fromCharCode(65 + (nibble & 0x0F));
}

function byteToLetters(byte) {
    const high = (byte >> 4) & 0x0F;
    const low = byte & 0x0F;
    return nibbleToLetter(high) + nibbleToLetter(low);
}

function parseCipherInput(text) {
    // Remove '0x' prefixes, whitespace and non-alphanumeric chars
    const clean = text.replace(/0x/gi, '').replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    if (clean.length === 0 || clean.length % 2 !== 0) {
        return null;
    }

    const isLetterEncoding = /^[A-P]+$/.test(clean);
    const isHexEncoding = /^[0-9A-F]+$/.test(clean);

    if (!isLetterEncoding && !isHexEncoding) {
        return null;
    }

    const bytes = [];
    if (isLetterEncoding) {
        for (let i = 0; i < clean.length; i += 2) {
            const high = clean.charCodeAt(i) - 65; // 'A'->0, 'P'->15
            const low = clean.charCodeAt(i + 1) - 65;
            bytes.push((high << 4) | low);
        }
    } else {
        for (let i = 0; i < clean.length; i += 2) {
            const val = parseInt(clean.substr(i, 2), 16);
            if (isNaN(val)) return null;
            bytes.push(val);
        }
    }
    return bytes;
}

function preparePrgaInput(isDecrypt = false) {
    const rawText = document.getElementById("sim-plaintext").value;
    if (!rawText) {
        alert("Please enter input text in the Input Text area.");
        return false;
    }

    const outLabel = document.getElementById("output-label");
    if (outLabel) {
        outLabel.textContent = isDecrypt ? "Decrypted Plaintext:" : "Ciphertext (Letters A–P):";
    }

    if (prga_raw_text !== rawText || prga_is_decrypt !== isDecrypt || prga_input_bytes.length === 0) {
        prga_raw_text = rawText;
        prga_is_decrypt = isDecrypt;
        prga_S = [...S];
        prga_i = 0;
        prga_j = 0;
        prga_step_index = 0;
        prga_keystream_bytes = [];
        prga_output_bytes = [];
        prga_input_bytes = [];

        if (isDecrypt) {
            const parsed = parseCipherInput(rawText);
            if (!parsed || parsed.length === 0) {
                alert("For Decrypt, please provide letter ciphertext (e.g. 'KD PK BL ON NI') or hex characters (e.g. 'A3 FA 1B'). Must be an even number of characters from A-P or 0-F.");
                return false;
            }
            prga_input_bytes = parsed;
        } else {
            for (let c = 0; c < rawText.length; c++) {
                prga_input_bytes.push(rawText.charCodeAt(c));
            }
        }

        // Reset grid display
        for (let idx = 0; idx < 256; idx++) {
            updateCell(idx);
        }
        clearCellHighlights();

        document.getElementById("prga-trace-tbody").innerHTML = "";
        document.getElementById("generated-keystream").textContent = "--";
        document.getElementById("sim-output").value = "";
    }
    return true;
}

function doPrgaStep() {
    if (!ksa_completed) return;
    if (!preparePrgaInput(prga_is_decrypt)) return;

    if (prga_step_index >= prga_input_bytes.length) {
        document.getElementById("prga-math-formula").textContent = "All keystream bytes have been generated for this message. Click 'Reset Keystream' to run again.";
        document.getElementById("btn-prga-step").disabled = true;
        return;
    }

    let k_idx = prga_step_index;
    let inByte = prga_input_bytes[k_idx];

    // Clear previous cell visual highlights
    clearCellHighlights();

    // 1. Advance i: i = (i + 1) mod 256
    let prev_i = prga_i;
    prga_i = (prga_i + 1) % 256;

    // 2. Advance j: j = (j + S[i]) mod 256
    let prev_j = prga_j;
    let s_i_val = prga_S[prga_i];
    prga_j = (prga_j + s_i_val) % 256;

    // 3. Swap S[i] and S[j]
    let s_j_val = prga_S[prga_j];
    let temp = prga_S[prga_i];
    prga_S[prga_i] = prga_S[prga_j];
    prga_S[prga_j] = temp;

    // 4. Calculate lookup index t = (S[i] + S[j]) mod 256
    let t = (prga_S[prga_i] + prga_S[prga_j]) % 256;
    let keystreamByte = prga_S[t];
    prga_keystream_bytes.push(keystreamByte);

    // 5. XOR Operation: InputByte ^ KeystreamByte
    let outByte = inByte ^ keystreamByte;
    prga_output_bytes.push(outByte);

    // Visual updates on the 256-cell grid
    updateCell(prga_i, "cell-i");
    updateCell(prga_j, "cell-j");
    if (t !== prga_i && t !== prga_j) {
        updateCell(t, "cell-t");
    }

    // Formatting strings
    let inByteHex = "0x" + ('0' + inByte.toString(16).toUpperCase()).slice(-2);
    let inLetters = byteToLetters(inByte);
    let inCharDisplay = prga_is_decrypt 
        ? `${inLetters} <small>(${inByteHex})</small>`
        : ((inByte >= 32 && inByte <= 126) ? `'${String.fromCharCode(inByte)}'` : inByteHex);
    let inCharSimple = prga_is_decrypt ? inLetters : ((inByte >= 32 && inByte <= 126) ? `'${String.fromCharCode(inByte)}'` : inByteHex);

    let kHex = "0x" + ('0' + keystreamByte.toString(16).toUpperCase()).slice(-2);
    let outHex = "0x" + ('0' + outByte.toString(16).toUpperCase()).slice(-2);
    let outLetters = byteToLetters(outByte);
    let outChar = (outByte >= 32 && outByte <= 126) ? `'${String.fromCharCode(outByte)}'` : outHex;

    // Output column display: letters A-P when encrypting, character when decrypting
    let outDisplay = prga_is_decrypt 
        ? `<strong>${outChar}</strong> <small>(${outHex})</small>`
        : `<strong style="color: #2a9d8f;">${outLetters}</strong> <small>(${outHex})</small>`;

    // Update PRGA status cards
    document.getElementById("prga-byte-idx").textContent = `Byte ${k_idx + 1} of ${prga_input_bytes.length} (${inCharSimple})`;
    document.getElementById("prga-val-i").textContent = `${prga_i} (S[i]=${prga_S[prga_i]})`;
    document.getElementById("prga-val-j").textContent = `${prga_j} (S[j]=${prga_S[prga_j]})`;
    document.getElementById("prga-val-t").textContent = `${t} (S[${t}]=${keystreamByte})`;
    document.getElementById("prga-val-k").textContent = `${kHex} (Dec: ${keystreamByte})`;

    let xorDetail = prga_is_decrypt
        ? `${inLetters} (${inByteHex}) ⊕ ${kHex} = <strong>${outChar}</strong> (${outHex})`
        : `${inCharSimple} (${inByteHex}) ⊕ ${kHex} = <strong>${outLetters}</strong> (${outHex})`;

    document.getElementById("prga-math-formula").innerHTML =
        `<strong>Byte ${k_idx + 1} Computation:</strong><br>` +
        `• Pointers: i = (${prev_i} + 1) mod 256 = <strong>${prga_i}</strong> | ` +
        `j = (${prev_j} + S[${prga_i}]=${s_i_val}) mod 256 = <strong>${prga_j}</strong><br>` +
        `• State Swap: S[${prga_i}] ↔ S[${prga_j}] (new S[${prga_i}]=${prga_S[prga_i]}, S[${prga_j}]=${prga_S[prga_j]})<br>` +
        `• Lookup index: t = (${prga_S[prga_i]} + ${prga_S[prga_j]}) mod 256 = <strong>${t}</strong><br>` +
        `• Keystream Byte: k = S[${t}] = <strong>${kHex}</strong> (${keystreamByte})<br>` +
        `• XOR Output: ${xorDetail}`;

    // Append to step table
    let tbody = document.getElementById("prga-trace-tbody");
    if (tbody.children.length === 1 && tbody.children[0].children.length === 1) {
        tbody.innerHTML = "";
    }

    let prevRow = tbody.querySelector(".active-step-row");
    if (prevRow) prevRow.classList.remove("active-step-row");

    let row = document.createElement("tr");
    row.className = "active-step-row";
    row.innerHTML = `
        <td>${k_idx + 1}</td>
        <td>${inCharDisplay}</td>
        <td>${prga_i}</td>
        <td>${prga_j}</td>
        <td>S[${prga_i}] ↔ S[${prga_j}]</td>
        <td>${t}</td>
        <td><strong style="color: #2a9d8f;">${kHex}</strong> <small>(${keystreamByte})</small></td>
        <td>${inByteHex} ⊕ ${kHex}</td>
        <td>${outDisplay}</td>
    `;
    tbody.appendChild(row);
    row.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

    // Update keystream view
    let keystreamHexStr = prga_keystream_bytes.map(b => ('0' + b.toString(16).toUpperCase()).slice(-2)).join(" ");
    document.getElementById("generated-keystream").textContent = keystreamHexStr;

    // Update Output: strictly letters A to Z (A-P) when encrypting
    let outputStr = "";
    if (prga_is_decrypt) {
        outputStr = prga_output_bytes.map(b => String.fromCharCode(b)).join("");
    } else {
        outputStr = prga_output_bytes.map(b => byteToLetters(b)).join(" ");
    }
    document.getElementById("sim-output").value = outputStr;

    prga_step_index++;
    if (prga_step_index >= prga_input_bytes.length) {
        document.getElementById("btn-prga-step").disabled = true;
    }
}

function runFullPrga(isDecrypt = false) {
    if (!ksa_completed) return;
    // Always re-initialize to process the entire input cleanly
    prga_raw_text = "";
    if (!preparePrgaInput(isDecrypt)) return;

    while (prga_step_index < prga_input_bytes.length) {
        doPrgaStep();
    }
}

function initSimulation() {
    initGrid();

    document.getElementById("btn-reset").addEventListener("click", resetSimulation);

    document.getElementById("btn-ksa-run").addEventListener("click", runFullKsa);

    document.getElementById("btn-ksa-step").addEventListener("click", () => {
        doKsaStep();
    });

    document.getElementById("btn-prga-step").addEventListener("click", () => {
        doPrgaStep();
    });

    document.getElementById("btn-encrypt").addEventListener("click", () => {
        runFullPrga(false);
    });

    document.getElementById("btn-decrypt").addEventListener("click", () => {
        runFullPrga(true);
    });

    document.getElementById("btn-prga-reset").addEventListener("click", () => {
        resetPrga();
    });
}


/* ========================================================
   Quiz Logic
======================================================== */
const quizQuestions = [
    {
        question: "During the second KSA iteration, suppose  the value of i=1, value of j after first iteration=75 and S[1]=1. The secret key is : \"key\"(ascii values: k=75,e=101,y=121). Calculate the new value of j, then identify which elements will be swapped.",
        options: ["S[1] and S[75]", "S[1] and S[177]", "S[75] and S[177]", "S[1] and S[2]"],
        answer: 1
    },
    {
        question: "What is a major security flaw that affected the RC4 algorithm?",
        options: [
            "It relies on complex mathematical transformations.",
            "Limited or biased key streams could lead to predictable output patterns.",
            "The algorithm uses an excessively long key length.",
            "The encryption process is too slow for practical use"
        ],
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

    // Only generate questions dynamically if not already statically rendered in the HTML
    if (quizContainer && quizContainer.querySelectorAll(".quiz-question").length === 0) {
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
    }

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
