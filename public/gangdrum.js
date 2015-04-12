'use strict';

var drum_ui;
var recorder;
var recCount=0;
var micinput;
var socket;

navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia;

// load a channel using wave file from URL
function load(name, url) {
    var request = new XMLHttpRequest();

    request.onload = function() {

        var audiodata = request.response;
        console.log("loaded " + name + " from " + url);

        drum_ui.drum_machine.audio.decodeAudioData(audiodata, function(buffer) {
            drum_ui.newTrack(name, buffer);
        });
    };

    request.error = function(e) {
        console.log("error loading " + name + " from " + url + " -- " + e);
    };

    request.open('GET', url, true);
    request.responseType = 'arraybuffer';
    request.send(null);
}


function start(uielt) {
    drum_ui = new DrumUI(uielt);

    // load('Kick1', 'samples/kick1.wav');
    // load('Boop', 'samples/boop.wav');

    load('Kick01', 'samples/k5electro/CYCdh_ElecK02-Kick01.wav');
    //    load('Kick02', 'samples/k5electro/CYCdh_ElecK02-Kick02.wav');
    //    load('ClHat01', 'samples/k5electro/CYCdh_ElecK02-ClHat01.wav');
    load('ClHat02', 'samples/k5electro/CYCdh_ElecK02-ClHat02.wav');
    //    load('Clap01', 'samples/k5electro/CYCdh_ElecK02-Clap01.wav');
    load('Clap02', 'samples/k5electro/CYCdh_ElecK02-Clap02.wav');
    load('FX01', 'samples/k5electro/CYCdh_ElecK02-FX01.wav');
    //    load('FX02', 'samples/k5electro/CYCdh_ElecK02-FX02.wav');
    //    load('FX03', 'samples/k5electro/CYCdh_ElecK02-FX03.wav');
    load('HfHat', 'samples/k5electro/CYCdh_ElecK02-HfHat.wav');
    load('Snr01', 'samples/k5electro/CYCdh_ElecK02-Snr01.wav');
    //    load('Snr02', 'samples/k5electro/CYCdh_ElecK02-Snr02.wav');
    load('Tom01', 'samples/k5electro/CYCdh_ElecK02-Tom01.wav');
    load('Tom02', 'samples/k5electro/CYCdh_ElecK02-Tom02.wav');
    //    load('Tom03', 'samples/k5electro/CYCdh_ElecK02-Tom03.wav');

    setupsocket();
}



// a single drum track, routing to master.
// identified by name
// audio data decoded into buffer
function DrumChannel(audio, master, name, buffer, notes) {
    
    this.name = name;
    this.buffer = buffer;
    this.notes = notes;

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

    this.setVol = function(gain)
    {
        this.gainNode.gain.value=gain;
    };

    this.getVol = function()
    {
        return this.gainNode.gain.value;
    };


    this.triggerNote = function(note) {

        if (this.notes[note])
        {
            this.play();
        }
  
    };

}



// main collection of drum channels
function GangDrum(audio) {

    this.audio = new audio();
    this.channels = [];

    // synchronization/timing settings
    this.tempo = 120;           //beats per minute
    this.ticks = 64;            //ticks per second
    this.loopLen=32;            //notes per loop
    this.notesPerBeat=4;        //
    this.ticksPerNote=-1;

    this.updateTiming = function() {
        this.ticksPerNote = this.ticks * 60 / this.tempo / this.notesPerBeat;
        // console.log("tpn: " + this.ticksPerNote);
        // console.log("tpl: " + this.ticksPerNote * this.loopLen);
    };

    this.updateTiming();

    this.uiCallback=null;


    // master bus compressor
    this.master = this.audio.createDynamicsCompressor();
    this.master.threshold.value = -50;
    this.master.knee.value = 40;
    this.master.ratio.value = 12;
    this.master.reduction.value = -20;
    this.master.attack.value = 0;
    this.master.release.value = 0.25;
    this.master.connect(this.audio.destination);

    this.tick=0;
    this.playing=false;


    this.start = function() {
        this.playing = true;

        this.doTimer(1,         // 1 unit
                     this.ticks,        // 64 per second
                     this.update.bind(this),
                     null //no on-complete
                    );
    };


    this.stop = function() {
        this.playing = false;
        this.tick=0;

        for (var i in this.channels)
        {
            if (this.channels[i].source)
                this.channels[i].source.stop(0);
        }

    };

    this.lastNote=-1;

    this.update = function() {

        // figure out loop position based on ticks/tempo

        if (! this.playing)
            return;

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

            if (this.uiCallback)
            {
                this.uiCallback(note);
            }
        }

        // this.count++;

        // if (this.count == 1)
        // {
        //     console.log("playing 0");
        //     this.channels[0].play();
        // }
        // else if (this.count == 2)
        // {
        //     console.log("playing 1");
        //     this.channels[1].play();
        // }
        // else
        // {
        //     this.count = 0;
        // }

    };



    this.addChannel = function(name, buffer, notes)
    {
        console.log('adding channel:' + name);
        var nc = new DrumChannel(this.audio, this.master, name, buffer, notes)
        this.channels.push(nc);
        return this.channels.length-1;
        
    };
    

    this.setTempo = function(tempo)
    {
        this.tempo = tempo;
        this.updateTiming();
    };



    // internal synchronization timer
    // from http://www.sitepoint.com/creating-accurate-timers-in-javascript/
    this.doTimer = function(length, resolution, oninstance, oncomplete)
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


}


function DrumUI(docelt) {
    this.trackdata=[];
    this.gotUserMedia=false;

    this.docelt = docelt;
    this.drum_machine
        = new GangDrum(window.AudioContext || window.webkitAudioContext);
    
    this.play = function() {
        this.drum_machine.start();
    };

    this.pause = function() {
        this.drum_machine.stop();

        for (var n=0; n<this.drum_machine.loopLen; n++)
            $('.s'+n).css("background-color", "white");
    };

    this.setTempo = function(tempo) {
        this.drum_machine.setTempo(tempo);
    };

    this.newTrack = function(name, audiodata) {

        var td = [];
        var track = this.drum_machine.addChannel(name, audiodata, td);
        this.trackdata[track]=td;

        var container = $( this.docelt );

        container.append('<div id="'+name+ '"><div class="trackname">'+name+'</div></div>');

        for (var i=0;  i<this.drum_machine.loopLen; i++)
        {
            $('#'+name).append('<span class="s'+i+'">'+
                               '<input type="checkbox" id="n'+track+'-'+i +'"/>' +
                               '</span>');

            $('#n'+track+'-'+i).change(
                function(tr, d, x) {return function()
                                {
                                    // toggle note for track, note x
                                    if (typeof d[x] == 'undefined' )
                                    {
                                        d[x]=0;
                                    }

                                    d[x] = (d[x]+1) % 2;
                                    console.log(d[x]);

                                    socket.emit('drum', track+'-'+x+'-'+d[x]);
                                    console.log("emitting " + track+'-'+x+'-'+d[x]);
                                    
                                }}(track, td, i)
            );
        }

    };


    this.setDrumNote = function(track, note, state) {

        this.trackdata[note]=state;

    };



    this.drawTime = function(note) {
        $('.s'+note).css("background-color", "blue");
        var prevnote = (note + this.drum_machine.loopLen-1)%this.drum_machine.loopLen;
        $('.s'+prevnote).css("background-color", "white");
    };

    this.drum_machine.uiCallback=this.drawTime.bind(this);

    this.record = function() {


        recorder.record();


    };
    
    this.stopRecord = function() {

        recorder.stop();
        
        // capture stream from mic
        // dump converted audio buffer into new channel
        recorder.getBuffer(loadRecorded);

    };

    
    if (! this.gotUserMedia && typeof navigator.getUserMedia != 'undefined') {
        navigator.getUserMedia({audio:true}, startUserMedia, function(e) {
            console.log("error: no live audio input! " + e);
        });
        this.gotUserMedia=true;
        console.log("recording at " + this.drum_machine.audio.sampleRate);
    }
}


function loadRecorded(audiodata) {
    
    var audioContext = drum_ui.drum_machine.audio;
    var newBuffer = audioContext.createBuffer( 1,
                                               audiodata[0].length,
                                               audioContext.sampleRate );

    console.log(audiodata); 
    console.log("chans: " + newBuffer.numberOfChannels);
    console.log("chans: " + newBuffer.sampleRate);

    // TODO: audio file cleanup

    // console.log(audiodata[0].length);
    // var max=-9999;
    // var min=9999;
    // for (var i=0; i<audiodata[0].length; i++)
    // {
    //     if (audiodata[0][i] > max)
    //         max = audiodata[0][i];
    //     if (audiodata[0][i] < min)
    //         min = audiodata[0][i];
    // }

    // console.log(audiodata[0].length + " - " + min + " - " + max);

    newBuffer.getChannelData(0).set(audiodata[0]);
    // newBuffer.getChannelData(1).set(audiodata[1]);

    drum_ui.newTrack('Recorded'+recCount++, newBuffer);
    recorder.clear();
};


// from https://github.com/mattdiamond/Recorderjs
function startUserMedia(stream) {

    var audio = drum_ui.drum_machine.audio;
    micinput = audio.createMediaStreamSource(stream);
    
    console.log('Media stream created.');


    // connect the AudioBufferSourceNode to the gainNode
    // and the gainNode to the destination, so we can play the
    // music and adjust the volume using the mouse cursor
    // micinput.connect(audio.destination);
    
    recorder = new Recorder(micinput,
                            {
                                workerPath: "lib/recorderWorker.js",
                                bufferLen: 256
                            });
    console.log('Recorder initialised.');
  }



function setupsocket()
{
    socket = io();

    socket.on('drum', function(msg) {
        console.log("got: " + msg);

        var parts = msg.split('-');

        // split up msg
        var track=parts[0];
        var note=parts[1];
        var value=parts[2];

        console.log(track);
        console.log(note);
        console.log(value);

        // drum_ui.trackdata[track][note]=state;
        $('#n'+track+'-'+note).prop('checked', (value !=0 ? true : false));
        drum_ui.trackdata[track][note]=value;
    });


}
