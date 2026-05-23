// ==UserScript==
// @name         Eru Mode Tracker
// @namespace    https://github.com/klouie1092
// @version      0.1.0
// @description  Creates support for eru mode in AMQ
// @author       Shinks
// @match        https://*.animemusicquiz.com/*
// @grant        none
// @require      https://github.com/joske2865/AMQ-Scripts/raw/master/common/amqScriptInfo.js
// @icon         https://www.google.com/s2/favicons?sz=64&domain=animemusicquiz.com
// ==/UserScript==

//Usage:
//"/eru <number of lives>": Starts eru game with that many lives
//"/eru stop": stops current eru game
"use strict"

let eruModeInProgress = false
let eruState = {
    numPlayers: 0,
    teamLives: 0,
    currentTeam1: 0,
    currentTeam2: 0
}
let commandPrefix = "/"
let commands = true

if (typeof Listener === "undefined") return

const loadInterval = setInterval(() => {
    if (document.querySelector("#loadingScreen.hidden")) {
        clearInterval(loadInterval);
        setup();
    }
}, 500);

function setup() {
    new Listener("game chat update", (data) => {
        for (const message of data.messages) {
            console.log(message)
            if (message.message.startsWith("/eru")) {
                parseCommand(message.message)
            }
        }
    }).bindListener()

    // stuff to do on answer reveal
    new Listener("answer results", (result) => {
        if (eruModeInProgress) {
            let playersByTeam = []
            for (const player of result.players) {
                let teamNumber = Object.values(quiz.players).find(x => x.gamePlayerId == player.gamePlayerId).teamNumber

                playersByTeam[teamNumber] = 0
                if (player.correct === true) {
                    playersByTeam[teamNumber] += 1
                }
            }
            playersByTeam = playersByTeam.filter(x => x != null && x != undefined)
            console.log(playersByTeam)

            //playersByTeam should always be even
            var midpoint = playersByTeam.length / 2
            for (let i = 0; i < midpoint; i++) {
                if(playersByTeam[i] > playersByTeam[midpoint + i])
                {
                    eruState.currentTeam2 -= 1
                }
                else if (playersByTeam[i] < playersByTeam[midpoint + i])
                {
                    eruState.currentTeam1 -= 1
                }
            }

            sendEruScore();
            if (eruState.currentTeam1 <= 0 || eruState.currentTeam2 <= 0)
            {
                eruModeInProgress = false;
                sendChatMessage("Eru game completed")
            }
        }
    }).bindListener()
}

function parseCommand(messageText) {
    const content = messageText.toLowerCase().trim();

    if (content === `${commandPrefix}commands on`) {
        commands = true;
        return;
    }

    if (!commands) return;
    const split = content.split(/\s+/);
    const command = split[0].slice(commandPrefix.length);

    if (command !== "eru") return;
    if (split[1] === "stop") {
        if (!eruModeInProgress) {
            sendChatMessage("No eru game is currently running");
            return;
        }
        eruModeInProgress = false;
        sendChatMessage("Eru game stopped");
        return;
    }

    if (split.length !== 2) {
        sendChatMessage("Usage: /eru <number of lives>");
        return;
    }

    const lives = parseInt(split[1], 10);

    if (Number.isNaN(lives) || lives <= 0) {
        sendChatMessage("Lives must be a positive number");
        return;
    }

    if (eruModeInProgress)
    {
        sendChatMessage("Cannot start an eru game while one is in progress")
        return;
    }

    eruState.numPlayers = Object.keys(quiz.players).length;
    eruState.teamLives = lives;
    eruState.currentTeam1 = lives;
    eruState.currentTeam2 = lives;

    if (eruState.numPlayers % 2 !== 0) {
        sendChatMessage("Cannot start eru mode with an odd number of players");
        return;
    }

    const teams = [];

    for (const player of Object.values(quiz.players)) {
        if (player.teamNumber == null) {
            sendChatMessage("All players must be in teams");
            return;
        }

        teams[player.teamNumber] = (teams[player.teamNumber] || 0) + 1;
    }

    const teamCount = teams.filter(x => x != null).length;

    if (teamCount !== eruState.numPlayers) {
        sendChatMessage("All players must be on their own team for eru mode");
        return;
    }

    sendChatMessage(
        `Starting eru mode for ${eruState.numPlayers} players with ${lives} lives per team`
    );

    eruModeInProgress = true;
    sendEruScore();
}

function sendEruScore(){
    sendChatMessage(`${eruState.currentTeam1}-${eruState.currentTeam2}`)
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