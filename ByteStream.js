'use strict';
// universal module definition
(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define([], factory);
    } else if (typeof exports === 'object') {
        // Node. Does not work with strict CommonJS, but
        // only CommonJS-like environments that support module.exports,
        // like Node.
        module.exports = factory();
    } else {
        // Browser globals (root is window)
        root.Bytestream = factory();
    }
}(this, function () {
  function assert(condition, message) {
    if (!condition) {
      error(message);
    }
  };

  var Bytestream = (function BytestreamClosure() {
    function constructor(arrayBuffer, start, length) {
      this.bytes = new Uint8Array(arrayBuffer);
      this.start = start || 0;
      this.pos = this.start;
      this.end = (start + length) || this.bytes.length;
    }
    constructor.prototype = {
      get length() {
        return this.end - this.start;
      },
      get position() {
        return this.pos;
      },
      get remaining() {
        return this.end - this.pos;
      },
      readU8Array: function (length) {
        if (this.pos > this.end - length)
          return null;
        var res = this.bytes.subarray(this.pos, this.pos + length);
        this.pos += length;
        return res;
      },
      readU32Array: function (rows, cols, names) {
        cols = cols || 1;
        if (this.pos > this.end - (rows * cols) * 4)
          return null;
        if (cols == 1) {
          var array = new Uint32Array(rows);
          for (var i = 0; i < rows; i++) {
            array[i] = this.readU32();
          }
          return array;
        } else {
          var array = new Array(rows);
          for (var i = 0; i < rows; i++) {
            var row = null;
            if (names) {
              row = {};
              for (var j = 0; j < cols; j++) {
                row[names[j]] = this.readU32();
              }
            } else {
              row = new Uint32Array(cols);
              for (var j = 0; j < cols; j++) {
                row[j] = this.readU32();
              }
            }
            array[i] = row;
          }
          return array;
        }
      },
      read8: function () {
        return this.readU8() << 24 >> 24;
      },
      readU8: function () {
        if (this.pos >= this.end)
          return null;
        return this.bytes[this.pos++];
      },
      read16: function () {
        return this.readU16() << 16 >> 16;
      },
      readU16: function () {
        if (this.pos >= this.end - 1)
          return null;
        var res = this.bytes[this.pos + 0] << 8 | this.bytes[this.pos + 1];
        this.pos += 2;
        return res;
      },
      read24: function () {
        return this.readU24() << 8 >> 8;
      },
      readU24: function () {
        var pos = this.pos;
        var bytes = this.bytes;
        if (pos > this.end - 3)
          return null;
        var res = bytes[pos + 0] << 16 | bytes[pos + 1] << 8 | bytes[pos + 2];
        this.pos += 3;
        return res;
      },
      peek32: function (advance) {
        var pos = this.pos;
        var bytes = this.bytes;
        if (pos > this.end - 4)
          return null;
        var res = bytes[pos + 0] << 24 | bytes[pos + 1] << 16 | bytes[pos + 2] << 8 | bytes[pos + 3];
        if (advance) {
          this.pos += 4;
        }
        return res;
      },
      read32: function () {
        return this.peek32(true);
      },
      readU32: function () {
        return this.peek32(true) >>> 0;
      },
      read4CC: function () {
        var pos = this.pos;
        if (pos > this.end - 4)
          return null;
        var res = "";
        for (var i = 0; i < 4; i++) {
          res += String.fromCharCode(this.bytes[pos + i]);
        }
        this.pos += 4;
        return res;
      },
      readFP16: function () {
        return this.read32() / 65536;
      },
      readFP8: function () {
        return this.read16() / 256;
      },
      readISO639: function () {
        var bits = this.readU16();
        var res = "";
        for (var i = 0; i < 3; i++) {
          var c = (bits >>> (2 - i) * 5) & 0x1f;
          res += String.fromCharCode(c + 0x60);
        }
        return res;
      },
      readUTF8: function (length) {
        var res = "";
        for (var i = 0; i < length; i++) {
          res += String.fromCharCode(this.readU8());
        }
        return res;
      },
      readPString: function (max) {
        var len = this.readU8();
        assert (len <= max);
        var res = this.readUTF8(len);
        this.reserved(max - len - 1, 0);
        return res;
      },
      skip: function (length) {
        this.seek(this.pos + length);
      },
      reserved: function (length, value) {
        for (var i = 0; i < length; i++) {
          assert (this.readU8() == value);
        }
      },
      seek: function (index) {
        if (index < 0 || index > this.end) {
          error("Index out of bounds (bounds: [0, " + this.end + "], index: " + index + ").");
        }
        this.pos = index;
      },
      subStream: function (start, length) {
        return new Bytestream(this.bytes.buffer, start, length);
      }
    };
    return constructor;
  })();
  return Bytestream;
}));