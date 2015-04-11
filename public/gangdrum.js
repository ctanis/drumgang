'use strict';

var drum_machine;
var drum_ui;

function start(uielt) {
    drum_machine = new GangDrum(window.AudioContext || window.webkitAudioContext);
    drum_ui = new DrumUI(uielt);

    // load kick drum
    var request = new XMLHttpRequest();
    request.onload = function() {

        var audiodata = request.response;
        console.log("got kick");

        drum_machine.audio.decodeAudioData(audiodata, function(buffer) {
            var chan=drum_machine.addChannel('Kick1', buffer);
            chan.div=2;
        });
    };

    request.error = function(e) {
            console.log("request.error called. Error: " + e);
        };


    request.open('GET', 'samples/kick1.wav', true);
    request.responseType = 'arraybuffer';
    request.send(null);

    // load boop
    var req2 = new XMLHttpRequest();
    req2.onload = function() {

        var audiodata = req2.response;
        console.log("got kick");

        drum_machine.audio.decodeAudioData(audiodata, function(buffer) {
            var chan = drum_machine.addChannel('Boop', buffer);
            chan.div=8;
        });
    }

    req2.error = function(e) {
            console.log("req2.error called. Error: " + e);
        };


    req2.open('GET', 'samples/boop.wav', true);
    req2.responseType = 'arraybuffer';
    req2.send(null);

}




// a single drum track, routing to master.
// identified by name
// audio data decoded into buffer
function DrumChannel(audio, master, name, buffer) {
    
    this.name = name;
    this.buffer = buffer;

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

        if (note % this.div == 0)
        {
            this.play();
        }
  
    };

}



// main collection of drum channels
function GangDrum(audio) {

    this.audio = new audio();

    this.tempo = 120;           //beats per minute
    this.ticks = 64;            //ticks per second
    this.loopLen=16;            //notes per loop
    this.notesPerBeat=4;        //
    this.ticksPerNote=-1;


    this.updateTiming = function() {
        this.ticksPerNote = this.ticks * 60 / this.tempo / this.notesPerBeat;
    };

    this.updateTiming();

    this.ui = null;
    this.channels = [];
    this.playing=false;

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

    this.start = function() {
        this.playing = true;
        console.log("starting " + this.playing);

        this.doTimer(1,         // 1 unit
                     this.ticks,        // 64 per second
                     this.update.bind(this),
                     null //no on-complete
                    );
    };


    this.stop = function() {
        console.log("stopping " + this.playing);
        this.playing = false;
    };

    this.lastNote=-1;

    this.update = function() {

        // figure out loop position based on ticks/tempo

        // hit every channel with the current position

        this.tick++;
        if (this.tick > this.ticksPerNote * this.loopLen)
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



    this.addChannel = function(name, buffer)
    {
        console.log('adding channel:' + name);
        var nc = new DrumChannel(this.audio, this.master, name, buffer)
        this.channels.push(nc);
        return nc;
        
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
    this.docelt = docelt;

    this.draw = function() {
        
    };
    
}
