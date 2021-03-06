var express = require('express');

var app = express();

app.use(express.static('public'));
app.use('/samples', express.static('samples'));

app.get('/' , function(req, res) {
    res.redirect('/drum.html');
})


var http = require('http').Server(app);
var io = require('socket.io')(http);

http.listen(8080, function() {
    console.log('listening on *:8080');
})


io.on('connection', function(socket) {
    console.log('a user connected');

    socket.on('disconnect', function() {
        console.log('a user disconnected');
    });

    socket.on('note', function(msg) {
        console.log('a drum note setting has arrived: ' +msg);
        // io.emit('drum', msg);
        socket.broadcast.emit('note', msg);
    });

    socket.on('sound', function(msg) {
        console.log('a new sound has arrived: ' +msg);
        // io.emit('drum', msg);
        socket.broadcast.emit('sound', msg);
    });

    socket.on('presound', function(msg) {
        console.log('load preset: ' +msg);
        // io.emit('drum', msg);
        socket.broadcast.emit('presound', msg);
    });

    socket.on('tempo', function(msg) {
        // console.log('tempo change: ' +msg);
        // io.emit('drum', msg);
        socket.broadcast.emit('tempo', msg);
    });

    socket.on('sync', function(msg) {
        console.log('sync');
        socket.broadcast.emit('sync');
        socket.emit('sync');
    });



});

