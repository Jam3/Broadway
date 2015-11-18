'use strict';
// universal module definition
(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define(["./MP4Reader","./Player","./ByteStream"], factory);
    } else if (typeof exports === 'object') {
        // Node. Does not work with strict CommonJS, but
        // only CommonJS-like environments that support module.exports,
        // like Node.
        module.exports = factory(require("./MP4Reader"),require("./Player"),require("./ByteStream"));
    } else {
        // Browser globals (root is window)
        root.MP4Player = factory(root.MP4Reader,root.Player,root.ByteStream);
    }
}(this, function (MP4Reader,Player,ByteStream) {
  /**
   * Represents a 2-dimensional size value. 
   */
  var Size = (function size() {
    function constructor(w, h) {
      this.w = w;
      this.h = h;
    }
    constructor.prototype = {
      toString: function () {
        return "(" + this.w + ", " + this.h + ")";
      },
      getHalfSize: function() {
        return new Size(this.w >>> 1, this.h >>> 1);
      },
      length: function() {
        return this.w * this.h;
      }
    };
    return constructor;
  })();

  var MP4Player = (function reader() {
    var defaultConfig = {
      filter: "original",
      filterHorLuma: "optimized",
      filterVerLumaEdge: "optimized",
      getBoundaryStrengthsA: "optimized"
    };

    function constructor(stream, useWorkers, webgl, render) {
      this.stream = stream;
      this.useWorkers = useWorkers;
      this.webgl = webgl;
      this.render = render;

      this.statistics = {
        videoStartTime: 0,
        videoPictureCounter: 0,
        windowStartTime: 0,
        windowPictureCounter: 0,
        fps: 0,
        fpsMin: 1000,
        fpsMax: -1000,
        webGLTextureUploadTime: 0
      };

      this.onStatisticsUpdated = function () {};

      this.avc = new Player({
        useWorker: useWorkers,
        reuseMemory: true,
        webgl: webgl,
        size: {
          width: 640,
          height: 368
        }
      });
      
      this.webgl = this.avc.webgl;
      
      var self = this;
      this.avc.onPictureDecoded = function(){
        updateStatistics.call(self);
      };
      
      this.canvas = this.avc.canvas;
    }

    function updateStatistics() {
      var s = this.statistics;
      s.videoPictureCounter += 1;
      s.windowPictureCounter += 1;
      var now = Date.now();
      if (!s.videoStartTime) {
        s.videoStartTime = now;
      }
      var videoElapsedTime = now - s.videoStartTime;
      s.elapsed = videoElapsedTime / 1000;
      if (videoElapsedTime < 1000) {
        return;
      }

      if (!s.windowStartTime) {
        s.windowStartTime = now;
        return;
      } else if ((now - s.windowStartTime) > 1000) {
        var windowElapsedTime = now - s.windowStartTime;
        var fps = (s.windowPictureCounter / windowElapsedTime) * 1000;
        s.windowStartTime = now;
        s.windowPictureCounter = 0;

        if (fps < s.fpsMin) s.fpsMin = fps;
        if (fps > s.fpsMax) s.fpsMax = fps;
        s.fps = fps;
      }

      var fps = (s.videoPictureCounter / videoElapsedTime) * 1000;
      s.fpsSinceStart = fps;
      this.onStatisticsUpdated(this.statistics);
      return;
    }

    constructor.prototype = {
      readAll: function(callback) {
        console.info("MP4Player::readAll()");
        this.stream.readAll(null, function (buffer) {
          this.reader = new MP4Reader(new Bytestream(buffer));
          this.reader.read();
          var video = this.reader.tracks[1];
          this.size = new Size(video.trak.tkhd.width, video.trak.tkhd.height);
          console.info("MP4Player::readAll(), length: " +  this.reader.stream.length);
          if (callback) callback();
        }.bind(this));
      },
      play: function() {
        var reader = this.reader;

        if (!reader) {
          this.readAll(this.play.bind(this));
          return;
        };

        var video = reader.tracks[1];
        var audio = reader.tracks[2];

        var avc = reader.tracks[1].trak.mdia.minf.stbl.stsd.avc1.avcC;
        var sps = avc.sps[0];
        var pps = avc.pps[0];

        /* Decode Sequence & Picture Parameter Sets */
        this.avc.decode(sps);
        this.avc.decode(pps);

        /* Decode Pictures */
        var pic = 0;
        setTimeout(function foo() {
          var avc = this.avc;
          video.getSampleNALUnits(pic).forEach(function (nal) {
            avc.decode(nal);
          });
          pic ++;
          if (pic < 3000) {
            setTimeout(foo.bind(this), 1);
          };
        }.bind(this), 1);
      }
    };

    return constructor;
  })();
  return MP4Player;
}));