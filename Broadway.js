'use strict';
// universal module definition
(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define(['./MP4Player','./Stream'], factory);
    } else if (typeof exports === 'object') {
        // Node. Does not work with strict CommonJS, but
        // only CommonJS-like environments that support module.exports,
        // like Node.
        module.exports = factory(require("./MP4Player"),require('./Stream'));
    } else {
        // Browser globals (root is window)
        root.Broadway = factory(root.MP4Player,root.Stream);
    }
}(this, function () {
  var Broadway = (function broadway() {
    function constructor(div) {
      var src = div.attributes.src ? div.attributes.src.value : undefined;
      var width = div.attributes.width ? div.attributes.width.value : 640;
      var height = div.attributes.height ? div.attributes.height.value : 480;

      var controls = document.createElement('div');
      controls.setAttribute('style', "z-index: 100; position: absolute; bottom: 0px; background-color: rgba(0,0,0,0.8); height: 30px; width: 100%; text-align: left;");
      this.info = document.createElement('div');
      this.info.setAttribute('style', "font-size: 14px; font-weight: bold; padding: 6px; color: lime;");
      controls.appendChild(this.info);
      div.appendChild(controls);
      
      var useWorkers = div.attributes.workers ? div.attributes.workers.value == "true" : false;
      var render = div.attributes.render ? div.attributes.render.value == "true" : false;
      
      var webgl = "auto";
      if (div.attributes.webgl){
        if (div.attributes.webgl.value == "true"){
          webgl = true;
        };
        if (div.attributes.webgl.value == "false"){
          webgl = false;
        };
      };
      
      var infoStrPre = "Click canvas to load and play - ";
      var infoStr = "";
      if (useWorkers){
        infoStr += "worker thread ";
      }else{
        infoStr += "main thread ";
      };

      this.player = new MP4Player(new Stream(src), useWorkers, webgl, render);
      this.canvas = this.player.canvas;
      this.canvas.onclick = function () {
        this.play();
      }.bind(this);
      div.appendChild(this.canvas);
      
      
      infoStr += " - webgl: " + this.player.webgl;
      this.info.innerHTML = infoStrPre + infoStr;
      

      this.score = null;
      this.player.onStatisticsUpdated = function (statistics) {
        if (statistics.videoPictureCounter % 10 != 0) {
          return;
        }
        var info = "";
        if (statistics.fps) {
          info += " fps: " + statistics.fps.toFixed(2);
        }
        if (statistics.fpsSinceStart) {
          info += " avg: " + statistics.fpsSinceStart.toFixed(2);
        }
        var scoreCutoff = 1200;
        if (statistics.videoPictureCounter < scoreCutoff) {
          this.score = scoreCutoff - statistics.videoPictureCounter;
        } else if (statistics.videoPictureCounter == scoreCutoff) {
          this.score = statistics.fpsSinceStart.toFixed(2);
        }
        // info += " score: " + this.score;

        this.info.innerHTML = infoStr + info;
      }.bind(this);
    }
    constructor.prototype = {
      play: function () {
        this.player.play();
      }
    };
    return constructor;
  })();
  return Broadway;
}));
