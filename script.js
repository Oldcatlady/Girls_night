/* ========================================
   QUIZ SCRIPT – Haupt-Steuerungsdatei
   ======================================== */

/* ── GLOBALE VARIABLEN ──────────────────────────────────────────
   Diese Variablen sind überall im Script zugänglich ("global scope").
   Sie speichern den gesamten Spielzustand. */

let allQuestions = [];    // Alle Fragen aus der JSON-Datei (unveränderter Original-Array)
let questions = [];       // Aktuell aktiver Fragen-Array (kann gemischt sein)
let current = 0;          // Index der aktuell angezeigten Frage (0 = erste)
let correct = 0;          // Zähler: wie viele Antworten waren richtig
let wrong = 0;            // Zähler: wie viele Antworten waren falsch
let answered = false;     // Flag: hat der User die aktuelle Frage schon beantwortet?
let selectedTheme = "girl_power"; // Aktuell gewähltes Farbthema

// History-Array: speichert für jede Frage den Zustand nach dem Beantworten.
// Ermöglicht die "Zurück"-Navigation mit korrekter Anzeige.
// history[0] = Zustand von Frage 0, history[1] = Zustand von Frage 1, usw.
let history = [];


/* ========================================
   THEME HANDLING (Farbthema-Verwaltung)
   ======================================== */

function previewTheme(theme) {
    // Speichert das gewählte Theme in der globalen Variable
    selectedTheme = theme;

    // Setzt die Klasse am <body>-Element.
    // Girl Power ist das Default-Theme in :root → keine extra Klasse nötig.
    // Alle anderen Themes brauchen eine Klasse (z.B. "man_power"), damit
    // die CSS-Variablen überschrieben werden.
    document.body.className = theme === "girl_power" ? "" : theme;

    // Alle Theme-Buttons durchgehen und den aktiven markieren:
    // toggle(klasse, bedingung) → fügt hinzu wenn true, entfernt wenn false
    document.querySelectorAll(".theme-btn").forEach(btn => {
        btn.classList.toggle("active-theme", btn.dataset.theme === theme);
        // btn.dataset.theme liest das HTML-Attribut data-theme aus
    });

    // Vorschau-Box einblenden (sie hat CSS display:none, .visible macht display:block)
    const preview = document.getElementById("themePreview");
    preview.classList.add("visible");
}


/* ========================================
   SEITEN-NAVIGATION
   ======================================== */

// Blendet alle .page-Elemente aus und zeigt nur die gewünschte Seite
function showPage(id) {
    // Zuerst alle Seiten unsichtbar machen
    document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
    // Dann nur die gewünschte Seite einblenden
    document.getElementById(id).classList.add("active");
}

// Shortcut: zurück zur Startseite
function goToStart() {
    showPage("startPage");
}


/* ========================================
   QUIZ STARTEN
   ======================================== */

function startQuiz() {
    // Theme auf den <body> anwenden (falls der User auf der Startseite gewählt hat)
    document.body.className = selectedTheme === "girl_power" ? "" : selectedTheme;

    // Alle Zähler und Zustände auf Ausgangswerte zurücksetzen
    current = 0;
    correct = 0;
    wrong = 0;
    answered = false;
    history = [];   // Leerer Array → keine gespeicherten Antworten

    showPage("quizPage");
    loadQuestion(); // Erste Frage sofort laden
}


/* ========================================
   FRAGEN LADEN
   ======================================== */

function loadQuestion() {
    // Wenn current über das Ende des Arrays hinaus ist → Ergebnis zeigen
    if (current >= questions.length) {
        showResult();
        return; // Funktion hier beenden
    }

    let q = questions[current];           // Aktuelle Frage aus dem Array holen
    let savedState = history[current];    // Gespeicherter Zustand (falls schon beantwortet)

    // Fragetext ins h2-Element schreiben
    // cleanQuestionText() entfernt evtl. eingebettete Antworten aus dem Text
    document.getElementById("question").innerText = cleanQuestionText(q.question);

    // Feedback-Box zurücksetzen: Klassen entfernen, Inhalt leeren, verstecken
    document.getElementById("feedback").className = "";
    document.getElementById("feedback").innerHTML = "";
    document.getElementById("feedback").style.display = "none";

    // Texteingabefeld leeren (für Freitext-Fragen)
    document.getElementById("textAnswer").value = "";

    // Alte Antwort-Buttons aus dem DOM entfernen (Helper-Funktion weiter unten)
    clearAnswerButtons();
    document.getElementById("answers").innerHTML = "";

    // Entscheidung: Frage schon beantwortet (Rückblick) oder neu?
    if (savedState) {
        // Frage wurde schon beantwortet → im Read-Only-Rückblick-Modus anzeigen
        answered = true;
        renderQuestionWithState(q, savedState);
    } else {
        // Neue, noch unbeantwortete Frage → normal anzeigen
        answered = false;
        renderQuestion(q);
    }

    updateProgress();    // Fortschrittsbalken und Texte aktualisieren
    updateNavButtons();  // Zurück/Weiter-Buttons aktualisieren
}

// Rendert eine neue (noch unbeantwortete) Frage
function renderQuestion(q) {
    let answersDiv = document.getElementById("answers");

    // ── FALL 1: options ist ein Array ["A) Option1", "B) Option2", ...] ──
    if (q.options && Array.isArray(q.options)) {

        if (q.type === "mc" || !q.type) {
            // Multiple-Choice: Buttons für jede Option erstellen
            q.options.forEach(opt => {
                let btn = document.createElement("button"); // Neuen Button im Speicher erstellen
                btn.innerText = opt;
                btn.className = "answer-btn";
                // opt.trim().charAt(0) → nimmt den ersten Buchstaben als Antwort-Key (z.B. "A")
                btn.onclick = () => checkAnswer(opt.trim().charAt(0));
                answersDiv.appendChild(btn); // Button ins DOM einhängen
            });
            document.getElementById("textAnswer").style.display = "none";

        } else if (q.type === "copy") {
            // Copy-Typ: Buttons füllen das Textfeld aus (zum Abtippen/Lernen)
            q.options.forEach(opt => {
                let btn = document.createElement("button");
                btn.innerText = opt;
                btn.className = "answer-btn";
                btn.onclick = () => {
                    // Klick füllt das Textfeld mit dem Optionstext
                    document.getElementById("textAnswer").value = opt;
                    checkAnswer(opt); // Und prüft sofort die Antwort
                };
                answersDiv.appendChild(btn);
            });
            document.getElementById("textAnswer").style.display = "block";
        }
    }
    // ── FALL 2: options ist ein Objekt {"A": "Text1", "B": "Text2"} ──
    else if (q.options && typeof q.options === "object") {
        // Object.keys() gibt ["A", "B", "C", ...] zurück
        Object.keys(q.options).forEach(key => {
            let btn = document.createElement("button");
            btn.innerText = `${key}: ${q.options[key]}`; // z.B. "A: Richtige Antwort"
            btn.className = "answer-btn";
            btn.onclick = () => checkAnswer(key); // key = "A", "B", usw.
            answersDiv.appendChild(btn);
        });
        document.getElementById("textAnswer").style.display = "none";
    }

    // ── FALL 3: Reine Textfrage ohne Buttons ──
    if (q.type === "text") {
        document.getElementById("textAnswer").style.display = "block";
    }
}

// Rendert eine bereits beantwortete Frage (Read-Only, mit Auflösung)
function renderQuestionWithState(q, state) {
    let answersDiv = document.getElementById("answers");

    // Kleines Status-Badge oben in der Karte ("✔ Richtig beantwortet")
    let tag = document.createElement("div");
    tag.className = "reviewed-tag";
    tag.innerText = state.wasCorrect ? "✔ Richtig beantwortet" : "✖ Falsch beantwortet";
    answersDiv.appendChild(tag);

    // Richtige Antwort und User-Antwort normalisieren (Groß-/Kleinschreibung ignorieren)
    let correctLetter = (q.correct || q.answer || "").trim().toUpperCase();
    let userLetter = (state.userAnswer || "").trim().toUpperCase();

    // ── Array-Optionen im Rückblick ──
    if (q.options && Array.isArray(q.options)) {
        if (q.type === "mc" || !q.type) {
            q.options.forEach(opt => {
                let letter = opt.trim().charAt(0).toUpperCase();
                let btn = document.createElement("button");
                btn.innerText = opt;
                btn.className = "answer-btn";
                btn.disabled = true; // Nicht mehr anklickbar

                if (letter === correctLetter) {
                    btn.classList.add("btn-correct");        // Grün = richtige Antwort
                } else if (letter === userLetter && !state.wasCorrect) {
                    btn.classList.add("btn-wrong");          // Rot = falsch angeklickte Antwort
                } else {
                    btn.style.opacity = "0.45";              // Grau = nicht relevante Option
                }
                answersDiv.appendChild(btn);
            });
            document.getElementById("textAnswer").style.display = "none";

        } else if (q.type === "copy") {
            // Texteingabe im Rückblick: befüllt, aber deaktiviert
            let inputEl = document.getElementById("textAnswer");
            inputEl.style.display = "block";
            inputEl.value = state.userAnswer; // Die damalige Antwort anzeigen
            inputEl.disabled = true;

            q.options.forEach(opt => {
                let btn = document.createElement("button");
                btn.innerText = opt;
                btn.className = "answer-btn";
                btn.disabled = true;
                if (opt.toLowerCase() === correctLetter.toLowerCase()) {
                    btn.classList.add("btn-correct");
                } else {
                    btn.style.opacity = "0.45";
                }
                answersDiv.appendChild(btn);
            });
        }
    }
    // ── Objekt-Optionen im Rückblick ──
    else if (q.options && typeof q.options === "object") {
        Object.keys(q.options).forEach(key => {
            let btn = document.createElement("button");
            btn.innerText = `${key}: ${q.options[key]}`;
            btn.className = "answer-btn";
            btn.disabled = true;

            if (key.toUpperCase() === correctLetter) {
                btn.classList.add("btn-correct");
            } else if (key.toUpperCase() === userLetter && !state.wasCorrect) {
                btn.classList.add("btn-wrong");
            } else {
                btn.style.opacity = "0.45";
            }
            answersDiv.appendChild(btn);
        });
        document.getElementById("textAnswer").style.display = "none";
    }

    // Textfrage im Rückblick
    if (q.type === "text") {
        let inputEl = document.getElementById("textAnswer");
        inputEl.style.display = "block";
        inputEl.value = state.userAnswer;
        inputEl.disabled = true;
    }

    // Feedback-Box mit der gespeicherten Auflösung füllen
    let feedback = document.getElementById("feedback");
    let solution = q.correct || q.answer || "";
    if (state.wasCorrect) {
        feedback.className = "correct"; // Grüne CSS-Klasse
        feedback.innerHTML = `<b>Richtig!</b><br>${q.explanation || ""}<br><br><b>Antwort:</b> ${solution}`;
    } else {
        feedback.className = "wrong";   // Rote CSS-Klasse
        feedback.innerHTML = `<b>Falsch!</b><br>Richtige Antwort:<br><b>${solution}</b><br><br>${q.explanation || ""}`;
    }
    // Hinweis: display wird hier nicht gesetzt → CSS-Klassen .correct/.wrong machen display:block
}


/* ========================================
   ANTWORT PRÜFEN
   ======================================== */

function checkAnswer(value) {
    // Guard: wenn schon beantwortet, nichts tun (verhindert Doppel-Klicks)
    if (answered) return;
    answered = true;

    let q = questions[current];
    let feedback = document.getElementById("feedback");

    // Alle Buttons deaktivieren und leicht transparent machen
    document.querySelectorAll(".answer-btn").forEach(btn => {
        btn.disabled = true;
        btn.style.opacity = "0.5";
    });

    // Antworten normalisieren: Leerzeichen entfernen, Kleinschreibung
    let userAnswer   = value?.trim().toLowerCase();
    // ?. = Optional Chaining: kein Fehler wenn value null/undefined ist
    let correctAnswer = (q.correct || q.answer || "").trim().toLowerCase();
    // q.correct || q.answer = unterstützt beide JSON-Feldnamen
    let wasCorrect = userAnswer === correctAnswer;

    // Für Text/Copy-Fragen: direkter String-Vergleich statt Buchstaben-Vergleich
    if (q.type === "text" || q.type === "copy") {
        wasCorrect = value?.trim().toLowerCase() === correctAnswer;
    }

    // Buttons visuell einfärben (grün/rot/grau)
    document.querySelectorAll(".answer-btn").forEach(btn => {
        let btnText = btn.innerText.trim();
        // charAt(0) = erster Buchstabe des Button-Texts ("A", "B", usw.)
        let letter = btnText.charAt(0).toLowerCase();

        if (q.options && !Array.isArray(q.options)) {
            // Objekt-Format: Key direkt vergleichen
            if (letter === correctAnswer) {
                btn.classList.add("btn-correct");
                btn.style.opacity = "1";
            } else if (letter === userAnswer && !wasCorrect) {
                btn.classList.add("btn-wrong");
                btn.style.opacity = "1";
            }
        } else {
            // Array-Format: Buchstabe ODER vollständiger Text vergleichen
            // (fallback für Copy-Typ, wo der ganze Text die Antwort ist)
            if (letter === correctAnswer || btnText.toLowerCase() === correctAnswer) {
                btn.classList.add("btn-correct");
                btn.style.opacity = "1";
            } else if ((letter === userAnswer || btnText.toLowerCase() === userAnswer) && !wasCorrect) {
                btn.classList.add("btn-wrong");
                btn.style.opacity = "1";
            }
        }
    });

    // Feedback-Box befüllen und einblenden
    let solution = q.correct || q.answer || "";
    if (wasCorrect) {
        correct++; // Globalen Zähler erhöhen
        feedback.className = "correct";
        feedback.innerHTML = `<b>Richtig!</b><br>${q.explanation || ""}<br><br><b>Antwort:</b> ${solution}`;
    } else {
        wrong++;   // Globalen Zähler erhöhen
        feedback.className = "wrong";
        feedback.innerHTML = `<b>Falsch!</b><br>Richtige Antwort:<br><b>${solution}</b><br><br>${q.explanation || ""}`;
    }

    feedback.style.display = "block"; // Feedback-Box einblenden

    // Zustand dieser Frage im history-Array speichern
    // Wird für renderQuestionWithState() beim Zurücknavigieren verwendet
    history[current] = {
        answered: true,
        userAnswer: value,   // Die tatsächlich geklickte/eingegebene Antwort
        wasCorrect: wasCorrect
    };

    updateProgress();
    updateNavButtons();
}


/* ========================================
   NAVIGATION (Weiter / Zurück)
   ======================================== */

function nextQuestion() {
    let q = questions[current];

    // Wenn noch nicht geantwortet: Frage erst beantworten
    if (!answered) {
        if (q.type === "text" || q.type === "copy") {
            // Bei Freitext: Wert aus dem Eingabefeld holen
            let value = document.getElementById("textAnswer").value;
            if (!value.trim()) {
                // Leeres Feld → Fehlermeldung, nicht weitergehen
                let fb = document.getElementById("feedback");
                fb.className = "wrong";
                fb.innerHTML = "Bitte gib zuerst eine Antwort ein.";
                return;
            }
            checkAnswer(value); // Freitext-Antwort prüfen
            return;
        }
        // Bei Multiple-Choice: Fehlermeldung wenn kein Button geklickt
        let fb = document.getElementById("feedback");
        fb.className = "wrong";
        fb.innerHTML = "Bitte wähle zuerst eine Antwort aus.";
        return;
    }

    // Normal: eine Frage weiter
    current++;
    if (current < questions.length) {
        loadQuestion(); // Nächste Frage laden
    } else {
        showResult();   // Letzter Frage beantwortet → Ergebnis zeigen
    }
}

function prevQuestion() {
    if (current > 0) { // Nicht über Anfang hinaus
        current--;
        loadQuestion(); // Vorherige Frage laden (history liefert gespeicherten Zustand)
    }
}

function updateNavButtons() {
    let prevBtn = document.getElementById("prevBtn");
    let nextBtn = document.getElementById("nextBtn");

    // "Zurück"-Button nur anzeigen, wenn eine vorherige Frage existiert UND beantwortet wurde
    // (Nicht-beantwortete Fragen haben keinen history-Eintrag)
    prevBtn.style.display = (current > 0 && history[current - 1]) ? "block" : "none";

    // "Weiter"-Button immer anzeigen
    nextBtn.style.display = "block";

    // Text des Weiter-Buttons anpassen: letzte Frage + beantwortet → "Auswertung"
    if (current >= questions.length - 1 && answered) {
        nextBtn.innerText = "Auswertung →";
    } else {
        nextBtn.innerText = "Weiter →";
    }
}


/* ========================================
   FORTSCHRITT (Balken + Texte)
   ======================================== */

function updateProgress() {
    // Schutz: nicht ausführen wenn current außerhalb des Arrays
    if (current >= questions.length) return;

    // Wie viele Fragen wurden bisher beantwortet?
    // filter(h => h !== null) = zählt alle history-Einträge, die kein null sind
    let answeredCount = history.filter(h => h !== null).length;

    document.getElementById("progressText").innerText =
        `Frage ${current + 1} / ${questions.length}`;
        // +1 weil Arrays bei 0 beginnen, aber User "Frage 1" erwartet

    document.getElementById("scoreText").innerText =
        `✔ ${correct} | ✖ ${wrong}`;

    document.getElementById("percentText").innerText =
        answeredCount > 0
            ? `(${Math.round((correct / answeredCount) * 100)}%)`
            // Math.round() rundet auf ganze Zahlen (z.B. 66.666... → 67)
            : ""; // Leer wenn noch keine Frage beantwortet

    // Fortschrittsbalken: (aktuelle Frage / Gesamt) × 100 = Prozent
    document.getElementById("progressFill").style.width =
        ((current + 1) / questions.length) * 100 + "%";
}


function showResult() {
    let total = questions.length;
    let percent = total > 0 ? (correct / total) * 100 : 0;
    let grade = getGrade(percent);

    // Motivierender Spruch je nach Note
    const sprueche = {
        1: { emoji: "🏆", spruch: "Erste Klasse! Du bist ein echtes Technik-Talent!" },
        2: { emoji: "🎉", spruch: "Mega, weiter so! Du hast das richtig drauf!" },
        3: { emoji: "👍", spruch: "Solide! Mit etwas Übung wird das noch besser!" },
        4: { emoji: "💪", spruch: "Geschafft! Du kennst schon die Grundlagen – bleib dran!" },
        5: { emoji: "📚", spruch: "Nicht aufgeben! Jeder Profi hat mal klein angefangen." },
        6: { emoji: "🔄", spruch: "Bleib dran – probier es gleich nochmal! Du schaffst das!" }
    };

    const { emoji, spruch } = sprueche[grade] || { emoji: "💪", spruch: "Gut gemacht!" };

    document.getElementById("resultContent").innerHTML = `
        <div class="grade-badge">${grade}</div>
        <p style="color:var(--text-muted); font-size:0.85rem; margin-bottom:16px;">
            IHK-Note (1 = beste)
        </p>
        <p style="font-size:1.4rem; margin-bottom:8px;">${emoji}</p>
        <p style="font-size:1.1rem; font-weight:bold; margin-bottom:12px; color:var(--accent);">
            ${spruch}
        </p>
        <p style="font-size:1.1rem; margin-bottom:6px;">
            ${percent.toFixed(1)}% erreicht
        </p>
        <p style="color:var(--text-muted); margin-bottom:4px;">
            ✔ ${correct} richtige &nbsp;|&nbsp; ✖ ${wrong} falsche Antworten
        </p>
        <p style="color:var(--text-muted); font-size:0.85rem;">von ${total} Fragen</p>
    `;

    showPage("resultPage");

    // Konfetti nur bei Note 1, 2 oder 3
    if (grade <= 3) launchConfetti();
}

// ── KONFETTI ─────────────────────────────────────────
function launchConfetti() {
    const colors = ["#e879a0", "#378add", "#ffd700", "#7bc67e", "#ff8c42", "#b388ff"];
    const container = document.body;
    const pieces = 80; // Anzahl Konfetti-Teilchen

    for (let i = 0; i < pieces; i++) {
        const piece = document.createElement("div");

        piece.style.cssText = `
            position: fixed;
            top: -10px;
            left: ${Math.random() * 100}vw;
            width: ${6 + Math.random() * 8}px;
            height: ${6 + Math.random() * 8}px;
            background: ${colors[Math.floor(Math.random() * colors.length)]};
            border-radius: ${Math.random() > 0.5 ? "50%" : "2px"};
            opacity: 1;
            z-index: 9999;
            pointer-events: none;
            animation: konfettiFall ${2 + Math.random() * 3}s ease-in forwards;
            animation-delay: ${Math.random() * 1.5}s;
        `;

        container.appendChild(piece);

        // Teilchen nach Animation automatisch entfernen
        piece.addEventListener("animationend", () => piece.remove());
    }
}

// IHK-Notenschlüssel: gibt Note 1–6 basierend auf Prozentzahl zurück
function getGrade(p) {
    if (p >= 92) return 1; // Sehr gut
    if (p >= 81) return 2; // Gut
    if (p >= 67) return 3; // Befriedigend
    if (p >= 50) return 4; // Ausreichend
    if (p >= 30) return 5; // Mangelhaft
    return 6;              // Ungenügend (alles unter 30%)
}

/* ========================================
   SHUFFLE & NEUSTART
   ======================================== */

// Fisher-Yates-Algorithmus: mischt ein Array zufällig durch
// Geht von hinten nach vorne und tauscht jeden Element mit einem zufälligen
function shuffleArray(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        // Zufälliger Index zwischen 0 und i (inclusive)
        let j = Math.floor(Math.random() * (i + 1));
        // Destructuring-Swap: tauscht arr[i] und arr[j] ohne Hilfsvariable
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

function shuffleAndRestart() {
    // [...allQuestions] = Spread-Operator: erstellt eine flache Kopie des Arrays.
    // Wichtig: wir wollen allQuestions nicht verändern, nur questions mischen.
    questions = shuffleArray([...allQuestions]);
    current = 0;
    correct = 0;
    wrong = 0;
    answered = false;
    history = [];
    showPage("quizPage");
    loadQuestion();
}


/* ========================================
   HELPER-FUNKTIONEN
   ======================================== */

// Bereinigt den Fragetext: entfernt Antwort-Zeilen die manchmal im JSON eingebettet sind
function cleanQuestionText(text) {
    if (!text) return ""; // Leerstring wenn kein Text vorhanden
    return text
        .split("\nA)")[0]         // Alles ab "\nA)" abschneiden
        .split("\nAntwort:")[0]   // Alles ab "\nAntwort:" abschneiden
        .split("\nErklärung:")[0] // Alles ab "\nErklärung:" abschneiden
        .trim();                  // Leerzeichen vorne/hinten entfernen
        // Die Kette: text → nimm den Teil VOR dem ersten Trennzeichen → trim
}

// Entfernt alle bestehenden Antwort-Buttons aus dem DOM
function clearAnswerButtons() {
    // querySelectorAll gibt alle passenden Elemente zurück
    // forEach + remove() löscht jedes Element einzeln aus dem DOM
    document.querySelectorAll(".answer-btn").forEach(btn => btn.remove());
}


/* ========================================
   ENTER-TASTE für Texteingabe
   ======================================== */

// Eventlistener: wartet auf Tastendruck im Textfeld
document.getElementById("textAnswer").addEventListener("keydown", (e) => {
    if (e.key === "Enter") {         // Nur bei Enter reagieren
        let value = e.target.value;  // e.target = das Textfeld selbst
        if (value.trim()) checkAnswer(value); // Nur wenn nicht leer
    }
});


/* ========================================
   DATEN LADEN (Fragen aus JSON-Datei)
   ======================================== */

// fetch() lädt eine Datei asynchron (im Hintergrund, blockiert den Browser nicht)
// .then() = "wenn fertig, dann..." → Promise-Chaining
fetch("questions.json")
    .then(res => res.json())  // HTTP-Response in JavaScript-Objekt umwandeln
    .then(data => {
        allQuestions = data;          // Original-Array speichern (für Reset)
        questions = [...allQuestions]; // Arbeitskopie für das aktive Quiz
        showPage("startPage");         // Erst wenn Daten geladen: Startseite zeigen
        // Standard-Theme-Button als aktiv markieren
        const defaultBtn = document.querySelector('[data-theme="girl_power"]');
        if (defaultBtn) defaultBtn.classList.add("active-theme");
    })
    .catch(err => {
        // .catch() = Fehlerbehandlung, wenn fetch() scheitert (z.B. Datei nicht gefunden)
        console.error("Fehler beim Laden der Fragen:", err);
        // Gesamten Body mit Fehlermeldung ersetzen
        document.body.innerHTML =
            "<p style='color:red;padding:20px;'>Fehler: questions.json konnte nicht geladen werden.</p>";
    });


/* ========================================
   TOTENKOPF-STEUERUNG
   ======================================== */

// DOM-Elemente einmalig referenzieren (effizienter als jedes Mal getElementById)
const skull = document.getElementById("skull");
const humanEyes = document.querySelectorAll(".human-eye"); // NodeList: beide Augen
const irises = document.querySelectorAll(".iris");          // NodeList: beide Iris-Kreise
// || = falls skullToggleBtn nicht existiert, lizardToggleBtn versuchen
const toggleBtn = document.getElementById("skullToggleBtn") || document.getElementById("lizardToggleBtn");

let skullActive = true;       // Ist der Schädel gerade aktiv?
let isLaunching = false;      // Fliegt der Schädel gerade? (verhindert Doppel-Klick)

// Startposition: Bildschirmmitte
let sPosX = window.innerWidth / 2;
let sPosY = window.innerHeight / 2;

// Mausposition (wird per mousemove-Event laufend aktualisiert)
let mouseX = window.innerWidth / 2;
let mouseY = window.innerHeight / 2;

let sAngle = 0;            // Aktuelle Neigung des Schädels (in Radiant)
let eyeTimer = 0;          // Zähler für den Augen-Blink-Rhythmus
let eyesAreVisible = false; // Sind die menschlichen Augen gerade sichtbar?
let orbitAngle = 0;        // Winkel der Kreisbahn um den Cursor (in Radiant)
let mouthTimer = 0;
// Mausposition laufend aktualisieren
window.addEventListener("mousemove", (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
});

// Toggle-Button: Schädel ein- und ausschalten
if (toggleBtn) {
    toggleBtn.addEventListener("click", (e) => {
        e.stopPropagation(); // Verhindert, dass der Klick "durchfällt" zum skull-Element

        skullActive = !skullActive; // Umschalten (true → false → true ...)

        if (!skullActive) {
            toggleBtn.innerText = "💀 Ein";
            toggleBtn.classList.add("disabled");
            if (skull) skull.classList.add("skull-hidden"); // Schädel verstecken
        } else {
            toggleBtn.innerText = "💀 Aus";
            toggleBtn.classList.remove("disabled");
            if (skull) skull.classList.remove("skull-hidden"); // Schädel zeigen
            // Schädel direkt zur Mausposition teleportieren (kein langer Weg)
            sPosX = mouseX;
            sPosY = mouseY;
            sAngle = 0;
        }
    });
}

// Schädel beim Start sichtbar machen (HTML hat skull-hidden als Standard)
if (skull) skull.classList.remove("skull-hidden");

// Klick auf den Schädel → Abflug-Animation auslösen
if (skull) {
    skull.addEventListener("click", () => {
        if (isLaunching || !skullActive) return; // Schutz gegen Doppel-Klick

        isLaunching = true;

        // CSS-Variablen direkt am Element setzen.
        // Die @keyframes-Animation liest diese Werte für den Startpunkt.
        skull.style.setProperty('--startX', `${sPosX}px`);
        skull.style.setProperty('--startY', `${sPosY}px`);
        skull.style.setProperty('--startAngle', `${sAngle}rad`);

        skull.classList.add("skull-launching"); // CSS-Animation startet

        // Nach 5 Sekunden: Animation beenden, Schädel zurücksetzen
        setTimeout(() => {
            skull.classList.remove("skull-launching");
            sPosX = mouseX; // Schädel erscheint wieder bei der aktuellen Mausposition
            sPosY = mouseY;
            sAngle = 0;
            isLaunching = false;
        }, 5000); // 5000ms = 5 Sekunden
    });
}

// Haupt-Animationsschleife des Schädels (läuft ~60x pro Sekunde)
function updateSkullBehavior() {
    // Wenn inaktiv oder fliegend: Frame überspringen, aber Loop fortführen
    if (!skullActive || isLaunching) {
        requestAnimationFrame(updateSkullBehavior);
        return;
    }

    if (!skull) {
        requestAnimationFrame(updateSkullBehavior);
        return;
    }

    // ── ORBIT-BEWEGUNG ───────────────────────────────
    orbitAngle += 0.02; // Winkel pro Frame erhöhen → Schädel kreist um den Cursor
    const orbitRadius = 40; // Kreisradius in Pixeln

    // Zielposition auf dem Kreis berechnen (trigonometrisch)
    // Math.cos/sin(angle) gibt Werte zwischen -1 und 1 → × radius = Kreis
    // -30 / -35: Versatz damit der Schädel-Mittelpunkt auf der Bahn liegt, nicht die Ecke
    const sTargetX = mouseX + Math.cos(orbitAngle) * orbitRadius - 30;
    const sTargetY = mouseY + Math.sin(orbitAngle) * orbitRadius - 35;

    // ── SMOOTHING (Verzögertes Folgen) ───────────────
    const delay = 25; // Je größer, desto träger/schwerer wirkt der Schädel
    const dx = sTargetX - sPosX; // Differenz zum Ziel (x-Achse)
    const dy = sTargetY - sPosY; // Differenz zum Ziel (y-Achse)

    // Nur ein Bruchteil der Differenz pro Frame bewegen → weiche Bewegung
    // Bei delay=25: bewegt 1/25 der restlichen Strecke pro Frame
    sPosX += dx / delay;
    sPosY += dy / delay;

    // ── KIPP-ANIMATION ───────────────────────────────
    // Je mehr seitliche Bewegung (dx), desto mehr Neigung
    if (Math.abs(dx) > 0.5) { // Nur bei spürbarer Bewegung neigen
        sAngle += (dx / delay) * 0.05; // Kleine Winkeldrehung proportional zur Geschwindigkeit
    }

    // Position und Rotation per CSS-Transform setzen
    skull.style.transform = `translate(${sPosX}px, ${sPosY}px) rotate(${sAngle}rad)`;

    // ── AUGEN-BLINK-RHYTHMUS ─────────────────────────
    eyeTimer++;
    if (eyeTimer > 150) { // Alle ~150 Frames (ca. 2.5 Sekunden bei 60fps)
        eyeTimer = 0;
        if (Math.random() > 0.4) { // 60% Wahrscheinlichkeit für Zustandswechsel
            eyesAreVisible = !eyesAreVisible; // Umschalten
            humanEyes.forEach(eye => {
                // toggle(klasse, bedingung): hinzufügen wenn eyesAreVisible=true
                eye.classList.toggle("visible", eyesAreVisible);
            });
        }
    }

       // ── IRIS-BEWEGUNG ────────────────────────────────
    if (eyesAreVisible) {
        const irisX = Math.cos(orbitAngle * 3) * 3;
        const irisY = Math.sin(orbitAngle * 3) * 3;
        irises.forEach(iris => {
            iris.style.transform = `translate(${irisX}px, ${irisY}px)`;
        });
    }

    // ── ZAHNGEKLAPPER-SOUND ──────────────────────────  ← NEU (diese 5 Zeilen)
    mouthTimer++;
    if (mouthTimer >= 48 && skullActive) {
        mouthTimer = 0;
        playTeethChatter();
    }

    // Nächsten Frame anfordern
    requestAnimationFrame(updateSkullBehavior);
}


function playTeethChatter() {
  const ctx = new AudioContext();

  const clicks = 1;
  const interval = 0.1;

  for (let i = 0; i < clicks; i++) {
    const startTime = ctx.currentTime + i * interval;

    const bufferSize = ctx.sampleRate * 0.015; // ← kürzer: 15ms statt 40ms (knackiger)
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let j = 0; j < bufferSize; j++) {
      data[j] = (Math.random() * 2 - 1) * (1 - j / bufferSize);
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = 3500; // ← höher: 3500 statt 1200 (heller, zahniger)
    filter.Q.value = 2.0;          // ← schärfer: 2.0 statt 0.8 (weniger Rauschen)

    const gain = ctx.createGain();
    gain.gain.value = 0.3;         // ← leiser: 0.3 statt 0.6

    source.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    source.start(startTime);
  }

}

// Loop starten (läuft ab jetzt dauerhaft)
requestAnimationFrame(updateSkullBehavior);