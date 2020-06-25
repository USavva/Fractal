import vxShaderStr from './main.vert';
import fsShaderStr from './main.frag';
import Image2D from './tex.jpg';
import * as dat from 'dat.gui';

import Hash from '../hash.txt';

var gl;

function initGL (canvas) {
  try {
    gl = canvas.getContext('webgl2');
    gl.viewportWidth = canvas.width;
    gl.viewportHeight = canvas.height;
  } catch (e) {}
  if (!gl) {
    alert('Could not initialize WebGL');
  }
}

var Store = function () {
  this.param = [];
  this.tex = [];
  this.addTexture = function (Name, Num, Texture, Type) {
    var TempTex = {};
    TempTex.num = Num;
    TempTex.name = Name;
    TempTex.texture = Texture;
    TempTex.type = Type;
    this.tex.push(TempTex);
  };
  this.activeTextures = function () {
    for (var Texture of this.tex) {
      shaderProgram[Texture.name] = gl.getUniformLocation(shaderProgram, 'Tex2D');
      gl.activeTexture(gl['TEXTURE' + Texture.num]);
      gl.bindTexture(gl[Texture.type], Texture.texture);
      gl.uniform1i(shaderProgram[Texture.name], 0);
    }
  };
  this.addParam = function (Name, Type) {
    const Index = this.param.indexOf(Name);

    if (Index === -1) {
      var TempParam = {};
      TempParam.name = Name;
      TempParam.type = Type;
      this.param.push(TempParam);
    }
  };
  this.findParam = function (Name) {
    for (var Param of this.param) {
      if (Param.name === Name) {
        return this.param.indexOf(Param);
      }
    }
    return -1;
  };
  this.setUniform = function (Name, Value) {
    const Index = this.findParam(Name);
    const Param = this.param[Index];
    if (Index != -1) {
      shaderProgram[Param.name] = gl.getUniformLocation(shaderProgram, Param.name);
      if (Param.type == 'Matrix4fv') {
        gl['uniform' + Param.type](shaderProgram[Name], false, Value);
      } else {
        gl['uniform' + Param.type](shaderProgram[Name], Value);
      }
    }
  };
};

var storage = new Store();

var Params = function () {
  this.WFractal = 10.0;
  this.HFractal = 10.0;
  this.HSpeed = 10.0;
  this.WSpeed = -10.0;
};

function getShader (gl, type, str) {
  var shader;
  shader = gl.createShader(type);

  gl.shaderSource(shader, str);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    alert(gl.getShaderInfoLog(shader));
    return null;
  }

  return shader;
}

var shaderProgram;

function initShaders () {
  var fragmentShader = getShader(gl, gl.FRAGMENT_SHADER, fsShaderStr);
  var vertexShader = getShader(gl, gl.VERTEX_SHADER, vxShaderStr);

  shaderProgram = gl.createProgram();
  gl.attachShader(shaderProgram, vertexShader);
  gl.attachShader(shaderProgram, fragmentShader);
  gl.linkProgram(shaderProgram);

  if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
    alert('Could not initialize shaders');
  }

  gl.useProgram(shaderProgram);

  shaderProgram.vertexPositionAttribute = gl.getAttribLocation(shaderProgram, 'aVertexPosition');
  gl.enableVertexAttribArray(shaderProgram.vertexPositionAttribute);
}

var offL = 0.0;
var offR = 1.0;
var offD = 0.0;
var offU = 1.0;
var timeMs = Date.now();
var startTime = Date.now();
var Tex2D;
var WFractal = 10.0;
var HFractal = 10.0;
var HSpeed = 0.0;
var WSpeed = 0.0;

function setUniforms () {
  storage.setUniform('uTime', timeMs);
  storage.setUniform('offR', offR);
  storage.setUniform('offL', offL);
  storage.setUniform('offU', offU);
  storage.setUniform('offD', offD);
  storage.setUniform('HFractal', WFractal);
  storage.setUniform('HFractal', HFractal);
  storage.setUniform('HSpeed', HSpeed);
  storage.setUniform('WSpeed', WSpeed);

  storage.activeTextures();
}

var squareVertexPositionBuffer;

function initBuffers () {
  squareVertexPositionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, squareVertexPositionBuffer);
  var vertices = [
    1.0, 1.0, 0.0,
    -1.0, 1.0, 0.0,
    1.0, -1.0, 0.0,
    -1.0, -1.0, 0.0
  ];
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
  squareVertexPositionBuffer.itemSize = 3;
  squareVertexPositionBuffer.numItems = 4;
}

function drawScene () {
  timeMs = (Date.now() - startTime) / 1000;
  gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  gl.bindBuffer(gl.ARRAY_BUFFER, squareVertexPositionBuffer);
  gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, squareVertexPositionBuffer.itemSize, gl.FLOAT, false, 0, 0);
  setUniforms();
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, squareVertexPositionBuffer.numItems);
}

function loadTexture () {
  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);

  const pixel = new Uint8Array([0, 0, 255, 255]);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, pixel);

  const image = new Image();
  image.onload = function () {
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    if (isPowerOf2(image.width) && isPowerOf2(image.height)) {
      gl.generateMipmap(gl.TEXTURE_2D);
    } else {
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    }
  };
  image.src = Image2D;

  return texture;
}

function isPowerOf2 (value) {
  return (value & (value - 1)) === 0;
}

function tick () {
  window.requestAnimationFrame(tick);
  drawScene();
}

function GuiInit () {
  var menu = new Params();
  var gui = new dat.GUI();

  var contrWFractal = gui.add(menu, 'WFractal');
  var contrHFractal = gui.add(menu, 'HFractal');
  var contrHSpeed = gui.add(menu, 'HSpeed');
  var contrWSpeed = gui.add(menu, 'WSpeed');
  contrWFractal.onChange(function (value) {
    WFractal = value;
  });
  contrHFractal.onChange(function (value) {
    HFractal = value;
  });
  contrHSpeed.onChange(function (value) {
    HSpeed = value;
  });
  contrWSpeed.onChange(function (value) {
    WSpeed = value;
  });
}

function StorageInit () {
  Tex2D = loadTexture();
  storage.addTexture('Tex2D', 0, Tex2D, 'TEXTURE_2D');

  storage.addParam('uTime', '1f');
  storage.addParam('offR', '1f');
  storage.addParam('offL', '1f');
  storage.addParam('offU', '1f');
  storage.addParam('offD', '1f');
  storage.addParam('zoom', '1f');
  storage.addParam('WFractal', '1f');
  storage.addParam('HFractal', '1f');
  storage.addParam('HSpeed', '1f');
  storage.addParam('WSpeed', '1f');
}

var canvas = document.getElementById('Canvas');

function webGLStart () {
  canvas.addEventListener('mousemove', control);
  canvas.addEventListener('mousedown', mouseDown);
  canvas.addEventListener('mouseup', mouseUp);
  canvas.addEventListener('mouseout', mouseUp);
  canvas.addEventListener('wheel', mouseWheel);

  document.getElementById('hash').innerHTML += '<a href="https://github.com/USavva/Fractal">Git</a> hash: ' + Hash;

  GuiInit();

  initGL(canvas);

  StorageInit();

  initShaders();
  initBuffers();

  gl.clearColor(0.0, 0.0, 0.0, 1.0);
  gl.enable(gl.DEPTH_TEST);

  tick();
}

var xNew, xOld, yNew, yOld;
var IsClicked = false;

function mouseDown () {
  IsClicked = true;
}

function mouseUp () {
  IsClicked = false;
  xNew = undefined;
  yNew = undefined;
}

function getMousePos () {
  var rect = canvas.getBoundingClientRect();
  return {
    x: xNew - rect.left,
    y: yNew - rect.top
  };
}

function mouseWheel (e) {
  var MousePos = getMousePos();
  MousePos.y = 500 - MousePos.y;

  var scroll = e.deltaY / 10.0;
  var newZoom = 1;

  if (scroll > 0) {
    newZoom *= 1 + 0.5 * scroll / 100.0;
  } else {
    newZoom /= 1 - 0.5 * scroll / 100.0;
  }

  var newL = offL + MousePos.x / 500.0 * (offR - offL) * (1 - newZoom);
  var newD = offD + MousePos.y / 500.0 * (offU - offD) * (1 - newZoom);
  offR = newL + (offR - offL) * newZoom;
  offU = newD + (offU - offD) * newZoom;

  offL = newL;
  offD = newD;
}

function control (e) {
  xOld = xNew;
  xNew = e.clientX;
  yOld = yNew;
  yNew = e.clientY;
  if (IsClicked) {
    if (xOld !== undefined) {
      var newL = offL - (xNew - xOld) / 500.0 * (offR - offL);
      offR = newL + (offR - offL);
      offL = newL;
    }
    if (yOld !== undefined) {
      var newD = offD + (yNew - yOld) / 500.0 * (offU - offD);
      offU = newD + (offU - offD);
      offD = newD;
    }
  }
}

document.addEventListener('DOMContentLoaded', webGLStart)
;
