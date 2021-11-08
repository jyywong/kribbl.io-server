const express = require('express');
const listOfWords = require('./listOfWords.js');
const app = express();
const port = 3001;
const http = require('http');
const server = http.createServer(app);
const { Server } = require('socket.io');
const io = new Server(server, {
	cors: {
		origin: 'http://localhost:3000'
	}
});

app.get('/', (req, res) => {
	res.sendFile(__dirname + '/index.html');
});

app.get('/create_room', (req, res) => {
	res.send('create a room');
});

//----------------------- Helper Functions
const getRandomWord = () => {
	const randomWord = listOfWords.list[Math.floor(Math.random() * listOfWords.list.length)];

	return randomWord;
};

const countdown = () => {
	const interval = setInterval(() => {
		io.sockets.emit('timerTick', countdownTime);
		if (countdownTime <= 0) {
			clearInterval(interval);
			setTimeout(() => {
				io.emit('newRound');
				playersList.forEach((playerGrand) => {
					const playerRoundStats = roundScoresList.find((player) => {
						return player.id === playerGrand.id;
					});
					playerGrand.score += playerRoundStats.score;
				});
				setupRoundStart();
			}, 3000);
		}
		countdownTime--;
	}, 1000);
};

const updateAndRemoveDisconnectedPlayer = (socket) => {
	const indexDiscUser = playersList.findIndex((player) => player.id === socket.id);
	playersList.splice(indexDiscUser, 1);
	io.emit('updatePlayersList', playersList);
};
const updatePlayerListWithDrawer = (playersList) => {
	playersList.forEach((player) => {
		player.isDrawing = false;
	});
	playersList[currentDrawerIndex].isDrawing = true;
	io.emit('updatePlayersList', playersList);
};
const setupRoundStart = () => {
	if (currentRound < maxRounds) {
		countdownTime = 10;
		randomWord = getRandomWord();
		currentDrawer = playersList[currentDrawerIndex].id;
		updatePlayerListWithDrawer(playersList);
		currentDrawerIndex += 1;
		if (currentDrawerIndex >= playersList.length) {
			currentDrawerIndex = 0;
		}
		io.to(currentDrawer).emit('youAreDrawer', randomWord);
		io.emit('wordHint', randomWord.length);
		roundScoresList = playersList.map(({ id }) => ({ id, score: 0 }));

		io.emit('newRoundScore', roundScoresList);
		currentRound++;
		countdown();
	} else {
		io.emit('endOfGame');
	}
};

const updateScoreWhenCorrectGuess = (socket) => {
	const targetPlayerIndex = roundScoresList.findIndex((player) => player.id === socket.id);
	roundScoresList[targetPlayerIndex].score += 100;
	io.emit('newRoundScore', roundScoresList);
};

const updateGuessedStatusOnCorrectGuess = (socket) => {
	const targetGrandPlayerIndex = playersList.findIndex((player) => player.id === socket.id);
	playersList[targetGrandPlayerIndex].hasGuessed = true;
	io.emit('updatePlayersList', playersList);
};
//----------------------- End Helper Functions

//----------------------- Session Variables

const playersList = [];
let maxRounds = 3;
let currentRound = 0;
let roundScoresList = [];
let roundScoresListBlank = [];
let gameStart = false;
let currentDrawer = null;
let randomWord = '';
let maxTime = 10;
let countdownTime = 10;
let currentDrawerIndex = 0;

//----------------------- End Session Variables

io.on('connection', async (socket) => {
	playersList.push({ id: socket.id, score: 0, hasGuessed: false, isDrawing: false });
	io.emit('updatePlayersList', playersList);
	console.log('userConnected');

	socket.on('disconnect', () => {
		console.log('user disconnected');
		updateAndRemoveDisconnectedPlayer(socket);
		if (playersList.length === 1) {
			gameStart = false;
			countdownTime = 5;
		}
	});
	socket.on('newPlayerName', (response) => {
		console.log(response);
		const targetGrandPlayerIndex = playersList.findIndex((player) => player.id === socket.id);
		playersList[targetGrandPlayerIndex].name = response;
	});
	socket.on('requestPlayersList', () => {
		io.emit('updatePlayersList', playersList);
	});
	socket.on('startGame', () => {
		gameStart = true;
		io.emit('gameStarted');
		setupRoundStart();
	});
	socket.on('newMessage', (response) => {
		console.log('newMessage', response);

		if (response.message === randomWord) {
			updateScoreWhenCorrectGuess(socket);
			updateGuessedStatusOnCorrectGuess(socket);
			io.emit(`someoneGuessedRight`, socket.id);
		} else {
			socket.broadcast.emit('serverNewMessage', { message: response.message });
		}
	});
	socket.on('drawing', (response) => {
		socket.broadcast.emit('serverNewDrawing', response);
	});
});

server.listen(port, () => {
	console.log(`listening on ${port}`);
});
