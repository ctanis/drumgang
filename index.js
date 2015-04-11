var express = require('express');

var app = express();

app.use(express.static('public'));
app.use('/samples', express.static('samples'));

var http = require('http').Server(app);

http.listen(8080, function() {
    console.log('listening on *:8080');
})
