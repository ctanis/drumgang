'use strict';

var drum_ui;

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

    load('Kick1', 'samples/kick1.wav');
    load('Boop', 'samples/boop.wav');

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
        var source = audio.createBufferSource();
        source.buffer = this.buffer;
        source.connect(this.gainNode);
        source.start(0);
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

        console.log("n: " + this.notes[note]);
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
        console.log("tpn: " + this.ticksPerNote);
        console.log("tpl: " + this.ticksPerNote * this.loopLen);
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
    };

    this.lastNote=-1;

    this.update = function() {

        // figure out loop position based on ticks/tempo

        // hit every channel with the current position

        this.tick++;
        if (this.tick >= this.ticksPerNote * this.loopLen)
            this.tick=0;

        var note = (this.tick / this.ticksPerNote) |0;

        if (note != this.lastNote)
        {
            this.lastNote = note;

            console.log("note: " + note);

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
    }



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

    this.docelt = docelt;
    this.drum_machine
        = new GangDrum(window.AudioContext || window.webkitAudioContext);
    
    this.play = function() {
        this.drum_machine.start();
    };

    this.pause = function() {
        this.drum_machine.stop();
    };

    this.setTempo = function(tempo) {
        this.drum_machine.setTempo(tempo);
    }

    this.newTrack = function(name, audiodata) {

        var td = [];
        var track = this.drum_machine.addChannel(name, audiodata, td);
        this.trackdata[track]=td;

        var container = $( this.docelt );

        container.append('<div id="'+name+ '"><div class="trackname">'+name+'</div></div>');

        for (var i=0;  i<this.drum_machine.loopLen; i++)
        {
            console.log(td);
            $('#'+name).append('<span class="s'+i+'">'+
                               '<input type="checkbox" id="n'+track+'-'+i +'"/>' +
                               '</span>');

            $('#n'+track+'-'+i).change(
                function(d, x) {return function()
                {
                    // toggle note for track, note x
                    if (typeof d[x] == 'undefined' )
                    {
                        d[x]=0;
                    }

                    d[x] = (d[x]+1) % 2;
                    console.log(d);
                }}(td, i)
            );
        }

    };

    this.drawTime = function(note) {
        $('.s'+note).css("background-color", "blue");
        var prevnote = (note + this.drum_machine.loopLen-1)%this.drum_machine.loopLen;
        $('.s'+prevnote).css("background-color", "white");
    };

    this.drum_machine.uiCallback=this.drawTime.bind(this);
}
