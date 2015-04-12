// refactored from hackathon day 1 mess

'use strict';


var drum_ui;                    //user/socket drum_engine interface
var drum_engine;                //underlying sequenced audio
var audio;                      //the audio context
var micinput;                   //html5 audio capture stream (not in Safari)
var socket;                     //socket.io connection for data synchronization


// load a channel using wave file from URL
function load(name, url) {
    drum_engine.addChannel(name);

    var request = new XMLHttpRequest();

    request.onload = function() {

        var audiodata = request.response;
        console.log("loaded " + name + " from " + url);

        audio.decodeAudioData(audiodata, function(buffer) {
            drum_engine.addChannel(name, buffer);
        });
    };

    request.error = function(e) {
        console.log("error loading " + name + " from " + url + " -- " + e);
    };

    request.open('GET', url, true);
    request.responseType = 'arraybuffer';
    request.send(null);
}



function start() {

    audio = new (window.AudioContext || window.webkitAudioContext)();
    drum_engine = new GangDrum();

    socket = io();              //undefined on no connection
    if (typeof socket == 'undefined')
    {
        socket=null;
    }

    drum_ui = new DrumUI("#drum");


    $(window).keydown(function(e) {
        // console.log(e.keyCode);

        switch (e.keyCode)
        {
        case 32:                //space
            drum_ui.playPause();
            break;
        case 13:                //enter
            drum_ui.stop();
            break;
        }
    });


// initial drum kit    
    load('Kick01', 'samples/k5electro/CYCdh_ElecK02-Kick01.wav');
    load('Kick02', 'samples/k5electro/CYCdh_ElecK02-Kick02.wav');
    load('ClHat01', 'samples/k5electro/CYCdh_ElecK02-ClHat01.wav');
    load('ClHat02', 'samples/k5electro/CYCdh_ElecK02-ClHat02.wav');
    load('Clap01', 'samples/k5electro/CYCdh_ElecK02-Clap01.wav');
    load('Clap02', 'samples/k5electro/CYCdh_ElecK02-Clap02.wav');
    load('FX01', 'samples/k5electro/CYCdh_ElecK02-FX01.wav');
    load('FX02', 'samples/k5electro/CYCdh_ElecK02-FX02.wav');
    load('FX03', 'samples/k5electro/CYCdh_ElecK02-FX03.wav');
    load('HfHat', 'samples/k5electro/CYCdh_ElecK02-HfHat.wav');
    load('Snr01', 'samples/k5electro/CYCdh_ElecK02-Snr01.wav');
    load('Snr02', 'samples/k5electro/CYCdh_ElecK02-Snr02.wav');
    load('Tom01', 'samples/k5electro/CYCdh_ElecK02-Tom01.wav');
    load('Tom02', 'samples/k5electro/CYCdh_ElecK02-Tom02.wav');
    load('Tom03', 'samples/k5electro/CYCdh_ElecK02-Tom03.wav');


    drum_ui.draw();
}


function DrumUI(uielt) {

// <input id="session" onChange="drum_ui.session()"/>
//    this.session = function() {
//        socket.
//        $('#session').val();
//        console.log($('#session'));
//    };

    if (socket) {
        console.log("registering socket handlers");

        // set up handlers
        socket.on('note', function(msg) {
            console.log("got: " + msg);

            var parts = msg.split('-');

            // split up msg
            var track=parts[0];
            var note=parts[1];
            var value=parts[2];

            console.log(track);
            console.log(note);
            console.log(value);

            drum_ui.setNote(track,note,value);
        });


        socket.on('sound', function(msg) {
            console.log(msg);

            var audioContext = drum_ui.drum_machine.audio;
            var f32buff = new Float32Array(msg.data);


            var newBuffer = audioContext.createBuffer( 1,
                                                       f32buff.length,
                                                       audioContext.sampleRate );

            newBuffer.getChannelData(0).set(f32buff);

            drum_ui.newTrack(msg.name, newBuffer);
        });
        

    }


    


    this.playPause = function() {

        var curr = $('#playbutton').val();

        if (curr == "pause")
        {
            drum_engine.stop();
            $('#playbutton').val('play');
        }
        else
        {
            drum_engine.start();
            $('#playbutton').val('pause');
        }

    };

    this.stop = function() {
        drum_engine.stop();
        drum_engine.tick=0;

        $('#playbutton').val('play');

        for (var n=0; n<drum_engine.loopLen; n++) {
            $('.s'+n).css("background-color", "");
        }
    };

    this.setTempo = function() {
        drum_engine.tempo=$('#tempo').val();
        drum_engine.updateTiming();
    };


    this.draw = function() {
        $('#tracks').html("");

        for (var t in drum_engine.channels) {
            this.renderTrack(t);
        }
    };


    this.renderTrack = function(track) {

        var t = drum_engine.channels[track];
        var tdiv = 'track-' + t.name;

        $('#tracks').append('<div id="'+tdiv+'">');
        $('#'+tdiv).append('<div class="trackname">'+t.name+"</div>");
        $('#'+tdiv).append('<div class="tracknotes"></div>');

        var currclass = 'note0';

        for (var n=0; n<drum_engine.loopLen; n++)
        {
            var trackcolor = Math.floor(n/drum_engine.notesPerBeat)%2;
            if (trackcolor == 0)
            {
                currclass = 'note0';
            }
            else {
                currclass = 'note1';
            }

            var initval;
            if (t.notes[n]) {
                initval='<img src="noteon.png" class="noteon" width=30px height=10px/>';
            }
            else
            {
                
                initval='&nbsp;'
            }

            $('#'+tdiv).append('<div id="n'+t.name+'-'+n+'" class="'+currclass+' s'+n +'" onClick="drum_ui.toggle(\''+t.name+'\','+n+')">'+
                               initval
                               +'</div>');
        }

    };

    this.toggle = function(track, note) {
        var t = drum_engine.channels[track];
        var value = t.notes[note];

        if (typeof value == 'undefined' || value == 0)
        {
            value=1;
        }
        else
        {
            value=0;
        }

        // socket send track/value
        if (socket)
        {
            socket.emit('note', track+'-'+note+'-'+value);
        }
        this.setNote(track, note, value);
    };

    this.setNote = function(track, note, value)
    {
        if (value>0)
        {
            $('#n'+track+'-'+note).html('<img src="noteon.png" width=30px height=10px class="noteon"/>');
        }
        else
        {
            $('#n'+track+'-'+note).html("&nbsp;");
        }

        drum_engine.channels[track].notes[note]=value;
    };


    // callback from sequencer
    this.drawTime = function(note) {

        $('.s'+note).css("background-color", "yellow");
        var prevnote = (note + drum_engine.loopLen-1)%drum_engine.loopLen;
        $('.s'+prevnote).css("background-color", "");

    };


    this.clear = function() {
        drum_engine.clear();
        this.draw();
    };

}



// internal sequenced drum data
function GangDrum() {

    this.channels = [];         //individual tracks


    // timing settings
    this.tempo = 120;           //beats per minute
    this.ticks = 64;            //ticks per second
    this.loopLen=16;            //notes per loop
    this.notesPerBeat=4;        //
    this.ticksPerNote=-1;

    // call this after any change to the above settings
    this.updateTiming = function() {
        this.ticksPerNote = this.ticks * 60 / this.tempo / this.notesPerBeat;
    };

    this.updateTiming();


    // master bus compressor
    this.master = audio.createDynamicsCompressor();
    this.master.threshold.value = -50;
    this.master.knee.value = 40;
    this.master.ratio.value = 12;
    this.master.reduction.value = -20;
    this.master.attack.value = 0;
    this.master.release.value = 0.25;
    this.master.connect(audio.destination);

    this.tick=0;
    this.playing=false;

    // start sequencer
    this.start = function() {
        this.playing = true;

        this.doTimer(1,         // 1 unit
                     this.ticks,        // 64 per second
                     this.update.bind(this),
                     null //no on-complete
                    );
    };


    // stop sequencer
    this.stop = function() {
        this.playing = false;

        // stop the tracks
        for (var i in this.channels)
        {
            if (this.channels[i].source)
                this.channels[i].source.stop(0);
        }

    };


    this.lastNote=-1;

    // this is called repeatedly by timer, and triggers all tracks
    this.update = function() {

        if (! this.playing)
            return;

        // figure out loop position based on ticks/tempo
        this.tick++;
        if (this.tick >= this.ticksPerNote * this.loopLen)
            this.tick=0;

        var note = (this.tick / this.ticksPerNote) |0;

        if (note != this.lastNote)
        {
            this.lastNote = note;

            for (var i in this.channels)
            {
                this.channels[i].triggerNote(note);
            }

            drum_ui.drawTime(note);
        }
    };

    
    this.addChannel = function(name, buffer)
    {
        var nc = new DrumChannel(name, this.master, buffer);
        this.channels[name]=nc;
        return name;
    };
    
    
    // clear a track by name, or all tracks
    this.clear = function(name)
    {
        if (name)
        {
            this.channels[name].clear();
        }
        else {
            for (var i in this.channels)
            {
                this.channels[i].clear();
            }
        }
    };

    this.channel = function(name)
    {
        return this.channels[name];
    };
    
}



// a single drum track, routing to master.
// identified by name
// audio data decoded into buffer
function DrumChannel(name, master, buffer) {
    
    this.name = name;           //channel name
    this.buffer = buffer;       //audio data
    this.notes = [];            //sequencer note data

    this.gainNode = audio.createGain();
    this.gainNode.connect(master);

    this.play = function()
    {
        // cut previous sound
        if (this.source)
            this.source.stop(0);

        this.source = audio.createBufferSource();
        this.source.buffer = this.buffer;
        this.source.connect(this.gainNode);
        this.source.start(0);
    };

    this.triggerNote = function(note) {

        if (this.notes[note])
        {
            this.play();
        }
    };


    this.setVol = function(gain)
    {
        this.gainNode.gain.value=gain;
    };

    this.getVol = function()
    {
        return this.gainNode.gain.value;
    };

    this.clear = function()
    {
        this.notes=[];
    };

}


// internal synchronization timer
// from http://www.sitepoint.com/creating-accurate-timers-in-javascript/
GangDrum.prototype.doTimer = function(length, resolution, oninstance, oncomplete)
{
    var steps = (length / 100) * (resolution / 10),
        speed = length / steps,
        count = 0,
        start = new Date().getTime();

    this.instance = function()
    {
        if(count++ == steps)
        {
            oncomplete(steps, count);
        }
        else
        {
            oninstance(steps, count);

            var diff = (new Date().getTime() - start) - (count * speed);
            if (this.playing)
            {
                window.setTimeout(this.instance.bind(this), (speed - diff));
            }
        }
    };

    window.setTimeout(this.instance.bind(this), speed);
};
