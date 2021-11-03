const express = require('express');
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

io.on('connection', (socket) => {
	console.log('a user connected');
	socket.on('disconnect', () => {
		console.log('user disconnected');
	});
	socket.on('newMessage', (response) => {
		console.log('newMessage', response);
		socket.broadcast.emit('serverNewMessage', { message: response.message });
	});
	socket.on('drawing', (response) => {
		socket.broadcast.emit('serverNewDrawing', response);
	});
});

server.listen(port, () => {
	console.log(`listening on ${port}`);
});
