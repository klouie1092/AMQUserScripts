// ==UserScript==
// @name         AMQ NGM Tracker
// @namespace    https://github.com/klouie1092
// @version      0.1.0
// @description  Adds a window to track guesses in NGM and NGMC
// @author       Shinks
// @match        https://*.animemusicquiz.com/*
// @grant        none
// @require      https://github.com/joske2865/AMQ-Scripts/raw/master/common/amqScriptInfo.js
// @require      https://github.com/joske2865/AMQ-Scripts/raw/master/common/amqWindows.js
// ==/UserScript==

"use strict";

if (typeof Listener === "undefined") return;

const loadInterval = setInterval(() => {
    if (document.querySelector("#loadingScreen.hidden")) {
        clearInterval(loadInterval);
        setup();
    }
}, 500);

let ngmWindow;
let ngmState = {
    players: 4,
    Guesses: 4,
    playerGuesses: [],
    startingGuesses: []
};
let ngmUndoStack = [];
let lastSentGuesses = "";

/* ---------------- SETUP ---------------- */

function setup() {
    loadSettings();
    ngmWindow = new AMQWindow({
        id: "ngmWindow",
        title: "NGM Tracker",
        width: 650,
        height: 275,
        minWidth: 0,
        minHeight: 0,
        zIndex: 1005,
        resizable: true,
        draggable: true
    });

    ngmWindow.addPanel({
        id: "ngmPanel",
        width: 1.0,
        height: "100%",
        scrollable: { x: false, y: true }
    });

    ngmWindow.window.find(".modal-header").empty()
        .append(
        $("<i>", {
            class: "fa fa-times clickAble",
            style: "font-size:25px;top:8px;right:15px;position:absolute;"
        }).on("click", () => ngmWindow.close())
    )
        .append($("<h2>", { text: "NGM Tracker" }))
        .append(
        $("<div>", { class: "tabContainer" })
        .append(
            $("<div>", {
                id: "ngmTrackerTab",
                class: "tab clickAble"
            })
            .append("<span>Tracker</span>")
            .on("click", () => switchTab("ngmTracker"))
        )
        .append(
            $("<div>", {
                id: "ngmSettingsTab",
                class: "tab clickAble"
            })
            .append("<span>Settings</span>")
            .on("click", () => switchTab("ngmSettings"))
        )
    );

    ngmWindow.panels[0].panel
        .append(
        $("<div>", {
            id: "ngmTrackerContainer",
            class: "tabSection",
            style: "padding:6px;"
        })
        .append(
            $("<div>", {
                id: "ngmScoreDisplay",
                style: `display:flex;flex-direction:row;gap:6px;width:100%;`
                    })
                )
        .append(
            $("<button>", {
                text: "Undo Last Guess Use",
                style: "margin-top:6px;width:100%;padding:6px;background:#ffc107;color:black;border:none;font-weight:bold;"
            }).on("click", undoLastGuess)
        )
        .append(
            $("<button>", {
                text: "Reset Game",
                style: "margin-top:6px;width:100%;padding:6px;background:#6c757d;color:white;border:none;font-weight:bold;"
            }).on("click", resetGame)
        )
    )
        .append(
        $("<div>", {
            id: "ngmSettingsContainer",
            class: "tabSection",
            style: "padding:10px;"
        })
        .append($("<div>", { id: "ngmPlayerSettings" }))
        .append(
            $("<button>", {
                text: "Save Settings",
                style: "margin-top:10px;width:100%;padding:6px;background:#28a745;color:white;border:none;font-weight:bold;"
            }).on("click", saveSettings)
        )
    );

    buildSettingsUI();

    $(document).on("input", "#ngmPlayerCountInput", function () {
    buildGuessesInputs();
});

    buildUI();
    switchTab("ngmTracker");
    injectMenuButton();
    applyStyles();
}

/* ---------------- MENU ---------------- */

function injectMenuButton() {
    const tryInsert = setInterval(() => {
        const target = $("#optionListSettings");

        if (!target.length) return;

        if ($("#ngmMenuEntry").length) {
            clearInterval(tryInsert);
            return;
        }

        $("<li>", {
            id: "ngmMenuEntry",
            class: "clickAble",
            text: "NGM Tracker"
        })
            .on("click", () => ngmWindow.open())
            .insertBefore(target);

        clearInterval(tryInsert);
    }, 500);
}

/* ---------------- SETTINGS ---------------- */

function loadSettings() {
    ngmState.players = 4;
    ngmState.Guesses = 4;
    ngmState.startingGuesses = [5, 5, 4, 3];
    ngmState.playerGuesses = [...ngmState.startingGuesses];
}

function buildSettingsUI() {
    const $c = $("#ngmPlayerSettings");
    $c.empty();

    const $row = $("<div>", {
        style: "display:flex;align-items:center;gap:8px;margin-bottom:10px;"
    });

    $row.append($("<span>", {
        text: "Number of Players:",
        style: "font-weight:bold;"
    }));

    $row.append($("<input>", {
        id: "ngmPlayerCountInput",
        type: "number",
        min: 1,
        max: 16,
        value: ngmState.players,
        style: "width:70px;padding:5px;color:black;text-align:center;"
    }));

    $c.append($row);

    $c.append($("<div>", {
        id: "ngmGuessesContainer",
        style: "display:flex;gap:8px;flex-wrap:wrap;"
    }));

    buildGuessesInputs();
}

function saveSettings() {
    const playerCount = parseInt($("#ngmPlayerCountInput").val()) || 4;
    const guesses = [];

    $(".ngmGuessInput").each(function () {
        guesses.push(parseInt($(this).val()) || ngmState.Guesses);
    });

    ngmState.players = playerCount;
    ngmState.startingGuesses = guesses.slice(0, playerCount);
    ngmState.playerGuesses = [...ngmState.startingGuesses];

    buildSettingsUI();
    buildUI();
    switchTab("ngmTracker");
}

function buildGuessesInputs() {
    const $c = $("#ngmGuessesContainer");
    $c.empty();

    const count = Math.max(
        1,
        parseInt($("#ngmPlayerCountInput").val()) || ngmState.players
    );

    for (let i = 0; i < count; i++) {
        const value =
            ngmState.startingGuesses[i] ??
            ngmState.Guesses;

        $c.append(
            $("<div>", {
                style: "display:flex;flex-direction:column;align-items:center;background:#2a2a2a;padding:6px;border-radius:6px;width:70px;"
            })
            .append($("<div>", {
                text: `P${i + 1}`,
                style: "font-size:12px;margin-bottom:4px;"
            }))
            .append($("<input>", {
                class: "ngmGuessInput",
                type: "number",
                min: 0,
                value,
                style: "width:100%;padding:4px;color:black;text-align:center;"
            }))
        );
    }
}

/* ---------------- TRACKER ---------------- */

function buildUI() {
    const $c = $("#ngmScoreDisplay");
    $c.empty();
    ngmUndoStack = [];

    for (let i = 0; i < ngmState.players; i++) {
        const idx = i;
        const $box = $("<div>", {
            class: "ngmPlayerBox",
            style: "flex:1;display:flex;flex-direction:column;align-items:center;background:#2a2a2a;padding:6px;border-radius:6px;"
        });
        const $btn = $("<button>", {
            class: "playerButton ngmGuesses",
            text: ngmState.playerGuesses[i],
            style: "min-height:60px;font-size:24px;"
        }).on("click", () => {
            if (ngmState.playerGuesses[idx] <= 0) return;

            ngmUndoStack.push({ player: idx });
            ngmState.playerGuesses[idx]--;
            $btn.text(ngmState.playerGuesses[idx]);
            updatePlayerStateUI();
            maybeSendGuesses();
        });

        $box.append($("<div>", {
            text: `Player ${i + 1}`,
            style: "font-weight:bold;margin-bottom:6px;"
        }));

        $box.append($btn);
        $c.append($box);
    }
    updatePlayerStateUI();
}

/* ---------------- STATE UI ---------------- */

function updatePlayerStateUI() {
    $(".ngmPlayerBox").each(function (i) {
        const alive = ngmState.playerGuesses[i] > 0;
        $(this).toggleClass("ngmEliminated", !alive);
        $(this).find("button").prop("disabled", !alive);
    });
}

/* ---------------- RESET ---------------- */

function resetGame() {
    ngmState.playerGuesses = [...ngmState.startingGuesses];
    ngmUndoStack = [];

    $(".ngmGuesses").each(function (i) {
        $(this).text(ngmState.playerGuesses[i]);
    });

    updatePlayerStateUI();
    maybeSendGuesses(true);
}

/* ---------------- UNDO ---------------- */

function undoLastGuess() {
    if (!ngmUndoStack.length) return;
    const last = ngmUndoStack.pop();

    ngmState.playerGuesses[last.player]++;
    $(".ngmPlayerBox").eq(last.player)
        .find(".ngmGuesses")
        .text(ngmState.playerGuesses[last.player]);
    updatePlayerStateUI();
    maybeSendGuesses(true);
}

/* ---------------- CHAT ---------------- */

function maybeSendGuesses(force = false) {
    if (ngmState.playerGuesses.every(x => x == 0)) {
        resetGame();
    }
    const input = document.querySelector("#gcInput");
    const msg = ngmState.playerGuesses.join("");

    if (!input || (!force && msg === lastSentGuesses)) return;

    lastSentGuesses = msg;
    sendChatMessage(msg);
}

function sendChatMessage(msg) {
    if (!socket?.sendCommand) return;

    socket.sendCommand({
        type: "lobby",
        command: "game chat message",
        data: {
            msg,
            teamMessage: false
        }
    });
}

/* ---------------- TABS ---------------- */

function switchTab(tab) {
    const $w = $("#ngmWindow");
    $w.find(".tab").removeClass("selected");
    $w.find(".tabSection").hide();
    $w.find(`#${tab}Tab`).addClass("selected");
    $w.find(`#${tab}Container`).show();
}

/* ---------------- STYLE ---------------- */

function applyStyles() {
    let css = `
        #ngmWindow .modal-header {
            padding:0;
            height:74px;
        }

        #ngmWindow .modal-header h2 {
            font-size:22px;
            margin:0;
            padding:10px;
        }

        #ngmWindow .ngmEliminated {
            opacity:0.4;
            filter:grayscale(1);
        }

        #ngmWindow button.playerButton {
            background:#28a745;
            color:white;
            border:none;
            font-weight:bold;
            cursor:pointer;
            width:100%;
            border-radius:6px;
            transition:background 0.15s ease;
        }

        #ngmWindow button.playerButton:disabled {
            background:#6c757d;
            color:#ccc;
        }
    `;

    let s = document.getElementById("ngmStyle");

    if (!s) {
        s = document.createElement("style");
        s.id = "ngmStyle";
        document.head.appendChild(s);
    }

    s.textContent = css;
}