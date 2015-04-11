function play()
{
   var audioCtx=new (window.AudioContext || window.webkitAudioContext);
   var source=audioCtx.createBufferSource();

   var request = new XMLHttpRequest();

   request.open('GET', 'songurl.ogg', true);

   request.responseType = 'arraybuffer';


   request.onload = function() {
       var audioData = request.response;
       console.log("going to decode " + request.response.byteLength);

       audioCtx.decodeAudioData(audioData, function(buffer) {
           console.log("got file");
           source.buffer = buffer;
           source.connect(audioCtx.destination);
           source.loop = true;
           source.start(0);
       },
                                function (e) { console.log("error decoding audio"); }
                               );
   }

   request.send();

}
