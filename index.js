var express = require('express');

var app = express();

app.use(express.static('public'));
app.use('/samples', express.static('samples'));

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

    socket.on('drum', function(msg) {
        console.log('a drum note setting has arrived: ' +msg);
        // io.emit('drum', msg);
        socket.broadcast.emit('drum', msg);
    });

});

