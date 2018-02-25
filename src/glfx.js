/*
 * glfx.js
 * http://evanw.github.com/glfx.js/
 *
 * Copyright 2011 Evan Wallace
 * Released under the MIT license
 */

export const fx = function() {
    var exports = {};
    var gl;

    function clamp(lo, value, hi) {
        return Math.max(lo, Math.min(value, hi));
    }

    function wrapTexture(texture) {
        return {
            _: texture,
            loadContentsOf: function(element) {
                // 确保我们使用正确的全局WebGL上下文
                gl = this._.gl;
                this._.loadContentsOf(element);
            },
            destroy: function() {
                // 确保我们使用正确的全局WebGL上下文
                gl = this._.gl;
                this._.destroy();
            }
        };
    }

    function texture(element) {
        return wrapTexture(Texture.fromElement(element));
    }

    function initialize(width, height) {
        var type = gl.UNSIGNED_BYTE;

        // 去到浮点缓冲textures，如果我们可以，它会使散景滤镜看起来好多了。 请注意，在Windows上，当启用线性滤镜时，ANGLE不允许您呈现为浮点textures。
        // Go for floating point buffer textures if we can, it'll make the bokeh
        // filter look a lot better. Note that on Windows, ANGLE does not let you
        // render to a floating-point texture when linear filtering is enabled.
        // See http://crbug.com/172278 for more information.
        if (gl.getExtension('OES_texture_float') && gl.getExtension('OES_texture_float_linear')) {
            var testTexture = new Texture(100, 100, gl.RGBA, gl.FLOAT);
            try {
                // 只有使用gl.FLOAT，如果我们可以渲染到它
                testTexture.drawTo(function() { type = gl.FLOAT; });
            } catch (e) {}
            testTexture.destroy();
        }

        if (this._.texture) this._.texture.destroy();
        if (this._.spareTexture) this._.spareTexture.destroy();
        this.width = width;
        this.height = height;
        this._.texture = new Texture(width, height, gl.RGBA, type);
        this._.spareTexture = new Texture(width, height, gl.RGBA, type);
        this._.extraTexture = this._.extraTexture || new Texture(0, 0, gl.RGBA, type);
        this._.flippedShader = this._.flippedShader || new Shader(null, '\
	        uniform sampler2D texture;\
	        varying vec2 texCoord;\
	        void main() {\
	            gl_FragColor = texture2D(texture, vec2(texCoord.x, 1.0 - texCoord.y));\
	        }\
	    ');
        this._.isInitialized = true;
    }

    /*
      在画布上绘制texture，可选择宽度和高度进行缩放。如果没有给出宽度和高度，则原始texture宽度和高度使用。
    */
    function draw(texture, width, height) {
        if (!this._.isInitialized || texture._.width != this.width || texture._.height != this.height) {
            initialize.call(this, width ? width : texture._.width, height ? height : texture._.height);
        }

        texture._.use();
        this._.texture.drawTo(function() {
            Shader.getDefaultShader().drawRect();
        });

        return this;
    }

    function update() {
        this._.texture.use();
        this._.flippedShader.drawRect();
        return this;
    }

    function simpleShader(shader, uniforms, textureIn, textureOut) {
        (textureIn || this._.texture).use();
        this._.spareTexture.drawTo(function() {
            shader.uniforms(uniforms).drawRect();
        });
        this._.spareTexture.swapWith(textureOut || this._.texture);
    }

    function replace(node) {
        node.parentNode.insertBefore(this, node);
        node.parentNode.removeChild(node);
        return this;
    }

    function contents() {
        var texture = new Texture(this._.texture.width, this._.texture.height, gl.RGBA, gl.UNSIGNED_BYTE);
        this._.texture.use();
        texture.drawTo(function() {
            Shader.getDefaultShader().drawRect();
        });
        return wrapTexture(texture);
    }

    /*
       获取一个Uint8的像素值数组: [r, g, b, a, r, g, b, a, ...]
       数组的长度是 width * height * 4.
    */
    function getPixelArray() {
        var w = this._.texture.width;
        var h = this._.texture.height;
        var array = new Uint8Array(w * h * 4);
        this._.texture.drawTo(function() {
            gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, array);
        });
        return array;
    }

    function wrap(func) {
        return function() {
            // 确保我们使用正确的全局WebGL上下文
            gl = this._.gl;

            // 现在上下文已经切换，我们可以调用包装函数
            return func.apply(this, arguments);
        };
    }


    // from javax.media.jai.PerspectiveTransform

    function getSquareToQuad(x0, y0, x1, y1, x2, y2, x3, y3) {
        var dx1 = x1 - x2;
        var dy1 = y1 - y2;
        var dx2 = x3 - x2;
        var dy2 = y3 - y2;
        var dx3 = x0 - x1 + x2 - x3;
        var dy3 = y0 - y1 + y2 - y3;
        var det = dx1 * dy2 - dx2 * dy1;
        var a = (dx3 * dy2 - dx2 * dy3) / det;
        var b = (dx1 * dy3 - dx3 * dy1) / det;
        return [
            x1 - x0 + a * x1, y1 - y0 + a * y1, a,
            x3 - x0 + b * x3, y3 - y0 + b * y3, b,
            x0, y0, 1
        ];
    }

    function getInverse(m) {
        var a = m[0],
            b = m[1],
            c = m[2];
        var d = m[3],
            e = m[4],
            f = m[5];
        var g = m[6],
            h = m[7],
            i = m[8];
        var det = a * e * i - a * f * h - b * d * i + b * f * g + c * d * h - c * e * g;
        return [
            (e * i - f * h) / det, (c * h - b * i) / det, (b * f - c * e) / det,
            (f * g - d * i) / det, (a * i - c * g) / det, (c * d - a * f) / det,
            (d * h - e * g) / det, (b * g - a * h) / det, (a * e - b * d) / det
        ];
    }

    function multiply(a, b) {
        return [
            a[0] * b[0] + a[1] * b[3] + a[2] * b[6],
            a[0] * b[1] + a[1] * b[4] + a[2] * b[7],
            a[0] * b[2] + a[1] * b[5] + a[2] * b[8],
            a[3] * b[0] + a[4] * b[3] + a[5] * b[6],
            a[3] * b[1] + a[4] * b[4] + a[5] * b[7],
            a[3] * b[2] + a[4] * b[5] + a[5] * b[8],
            a[6] * b[0] + a[7] * b[3] + a[8] * b[6],
            a[6] * b[1] + a[7] * b[4] + a[8] * b[7],
            a[6] * b[2] + a[7] * b[5] + a[8] * b[8]
        ];
    }

    function warpShader(uniforms, warp) {
        return new Shader(null, uniforms + '\
	    uniform sampler2D texture;\
	    uniform vec2 texSize;\
	    varying vec2 texCoord;\
	    void main() {\
	        vec2 coord = texCoord * texSize;\
	        ' + warp + '\
	        gl_FragColor = texture2D(texture, coord / texSize);\
	        vec2 clampedCoord = clamp(coord, vec2(0.0), texSize);\
	        if (coord != clampedCoord) {\
	            /* fade to transparent if we are outside the image */\
	            gl_FragColor.a *= max(0.0, 1.0 - length(coord - clampedCoord));\
	        }\
	    }');
    }
    /**
     * @filter           Hue / Saturation
     * @description      Provides rotational hue and multiplicative saturation control. RGB color space
     *                   can be imagined as a cube where the axes are the red, green, and blue color
     *                   values. Hue changing works by rotating the color vector around the grayscale
     *                   line, which is the straight line from black (0, 0, 0) to white (1, 1, 1).
     *                   Saturation is implemented by scaling all color channel values either toward
     *                   or away from the average color channel value.
     * @param hue        -1 to 1 (-1 is 180 degree rotation in the negative direction, 0 is no change,
     *                   and 1 is 180 degree rotation in the positive direction)
     * @param saturation -1 to 1 (-1 is solid gray, 0 is no change, and 1 is maximum contrast)
     */
    function hueColor(args) {
        var hue = args[0],
        greenRed = args[1],
        purpleGreen = args[2],
        yellowBlue = args[3];
        gl.hueColor = gl.hueColor || new Shader(null, '\
	        uniform sampler2D texture;\
	        uniform float hue;\
	        uniform float greenRed;\
	        uniform float purpleGreen;\
	        uniform float yellowBlue;\
	        varying vec2 texCoord;\
	        void main() {\
	            vec4 color = texture2D(texture, texCoord);\
	            \
	            /* hue adjustment, wolfram alpha: RotationTransform[angle, {1, 1, 1}][{x, y, z}] */\
	            float angle = hue * 3.14159265;\
	            float s = sin(angle), c = cos(angle);\
	            vec3 weights = (vec3(2.0 * c, -sqrt(3.0) * s - c, sqrt(3.0) * s - c) + 1.0) / 3.0;\
	            float len = length(color.rgb);\
	            color.rgb = vec3(\
	                dot(color.rgb, weights.xyz),\
	                dot(color.rgb, weights.zxy),\
	                dot(color.rgb, weights.yzx)\
	            );\
	            color.r += greenRed; \
	            color.g -= greenRed; \
	            color.b -= greenRed; \
	            color.r -= purpleGreen; \
	            color.g += purpleGreen; \
	            color.b -= purpleGreen; \
	            color.r -= yellowBlue; \
	            color.g -= yellowBlue; \
	            color.b += yellowBlue; \
	            gl_FragColor = color;\
	        }\
	    ');

        simpleShader.call(this, gl.hueColor, {
            hue: clamp(-1, hue, 1),
            greenRed: clamp(-1, greenRed/5, 1),
            purpleGreen: clamp(-1, purpleGreen/5, 1),
            yellowBlue: clamp(-1, yellowBlue/5, 1)               
        });

        return this;
    }

    /**
     * @filter           Brightness / Contrast/ Saturation / Blur
     * @description      Provides additive brightness and multiplicative contrast control.
     * @param brightness -1 to 1 (-1 is solid black, 0 is no change, and 1 is solid white)
     * @param saturation -1 to 1 (-1 is solid gray, 0 is no change, and 1 is maximum contrast)
     * @param contrast   -1 to 1 (-1 is solid gray, 0 is no change, and 1 is maximum contrast)
     * @param radius The radius of the pyramid convolved with the image.
     */
    function brightnesscontrastSaturationBur(args) {
        var brightness = args[0],
        contrast = args[1],
        saturation = args[2],
        radius = args[3];
        gl.brightnesscontrastSaturationBur = gl.brightnesscontrastSaturationBur || new Shader(null, '\
            uniform sampler2D texture;\
            uniform float brightness;\
            uniform float contrast;\
            uniform float saturation;\
            uniform vec2 delta;\
            varying vec2 texCoord;\
            ' + randomShaderFunc + '\
            void main() {\
                vec4 color = vec4(0.0);\
                float total = 0.0;\
                \
                /* randomize the lookup values to hide the fixed number of samples */\
                float offset = random(vec3(12.9898, 78.233, 151.7182), 0.0);\
                \
                for (float t = -30.0; t <= 30.0; t++) {\
                    float percent = (t + offset - 0.5) / 30.0;\
                    float weight = 1.0 - abs(percent);\
                    vec4 sample = texture2D(texture, texCoord + delta * percent);\
                    \
                    /* switch to pre-multiplied alpha to correctly blur transparent images */\
                    sample.rgb *= sample.a;\
                    \
                    color += sample * weight;\
                    total += weight;\
                    color.rgb += brightness;\
                    if (contrast > 0.0) {\
                        color.rgb = (color.rgb - 0.5) / (1.0 - contrast) + 0.5;\
                    } else {\
                        color.rgb = (color.rgb - 0.5) * (1.0 + contrast) + 0.5;\
                    }\
                    /* saturation adjustment */\
                    float average = (color.r + color.g + color.b) / 3.0;\
                    if (saturation > 0.0) {\
                        color.rgb += (average - color.rgb) * (1.0 - 1.0 / (1.001 - saturation));\
                    } else {\
                        color.rgb += (average - color.rgb) * (-saturation);\
                    }\
                }\
                \
                gl_FragColor = color / total;\
                \
                /* switch back from pre-multiplied alpha */\
                gl_FragColor.rgb /= gl_FragColor.a + 0.00001;\
            }\
        ');

        simpleShader.call(this, gl.brightnesscontrastSaturationBur, {
            brightness: clamp(-1, brightness / 10, 1),
            contrast: clamp(-1, contrast / 100, 1),
            saturation: clamp(-1, saturation / 50, 1),
        });
        simpleShader.call(this, gl.brightnesscontrastSaturationBur, {
            delta: [radius / this.width, 0]
        });
        simpleShader.call(this, gl.brightnesscontrastSaturationBur, {
            delta: [0, radius / this.height]
        });

        return this;
    }


    // From: https://github.com/evanw/OES_texture_float_linear-polyfill
    (function() {
        // 上传2x2浮点texture，其中一个像素为2，其他三个像素为0。
        //仅当从texture的中心采样,样本是（2 + 0 + 0 + 0）/ 4 = 0.5时，才支持线性滤波。
        // Linear filtering is only supported if a sample taken
        // from the center of that texture is (2 + 0 + 0 + 0) / 4 = 0.5.
        function supportsOESTextureFloatLinear(gl) {
            // 首先需要浮点 textures
            if (!gl.getExtension('OES_texture_float')) {
                return false;
            }

            // 创建渲染目标
            var framebuffer = gl.createFramebuffer();
            var byteTexture = gl.createTexture();
            gl.bindTexture(gl.TEXTURE_2D, byteTexture);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
            gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
            gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, byteTexture, 0);

            // 创建一个在中心且值为0.5的简单浮点Texture
            var rgba = [
                2, 0, 0, 0,
                0, 0, 0, 0,
                0, 0, 0, 0,
                0, 0, 0, 0
            ];
            var floatTexture = gl.createTexture();
            gl.bindTexture(gl.TEXTURE_2D, floatTexture);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 2, 2, 0, gl.RGBA, gl.FLOAT, new Float32Array(rgba));

            // 创建测试着色器
            var program = gl.createProgram();
            var vertexShader = gl.createShader(gl.VERTEX_SHADER);
            var fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
            gl.shaderSource(vertexShader, '\
		      attribute vec2 vertex;\
		      void main() {\
		        gl_Position = vec4(vertex, 0.0, 1.0);\
		      }\
		    ');
            gl.shaderSource(fragmentShader, '\
		      uniform sampler2D texture;\
		      void main() {\
		        gl_FragColor = texture2D(texture, vec2(0.5));\
		      }\
		    ');
            gl.compileShader(vertexShader);
            gl.compileShader(fragmentShader);
            gl.attachShader(program, vertexShader);
            gl.attachShader(program, fragmentShader);
            gl.linkProgram(program);

            // 创建一个包含单个点的缓冲区
            var buffer = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0]), gl.STREAM_DRAW);
            gl.enableVertexAttribArray(0);
            gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

            // 渲染点并读取渲染的像素
            var pixel = new Uint8Array(4);
            gl.useProgram(program);
            gl.viewport(0, 0, 1, 1);
            gl.bindTexture(gl.TEXTURE_2D, floatTexture);
            gl.drawArrays(gl.POINTS, 0, 1);
            gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);

            // 如果线性滤镜起作用了，中心样本将只有0.5的值
            // The center sample will only have a value of 0.5 if linear filtering works
            return pixel[0] === 127 || pixel[0] === 128;
        }

        // 返回的扩展对象的构造函数
        function OESTextureFloatLinear() {}

        // Cache the extension so it's specific to each context like extensions should be
        // 缓存extension，它是特定于每个上下文
        function getOESTextureFloatLinear(gl) {
            if (gl.$OES_texture_float_linear$ === void 0) {
                Object.defineProperty(gl, '$OES_texture_float_linear$', {
                    enumerable: false,
                    configurable: false,
                    writable: false,
                    value: new OESTextureFloatLinear()
                });
            }
            return gl.$OES_texture_float_linear$;
        }

        // 这将替换实际的getExtension()
        function getExtension(name) {
            return name === 'OES_texture_float_linear' ? getOESTextureFloatLinear(this) : oldGetExtension.call(this, name);
        }

        // 这将替换实际的 getSupportedExtensions()
        function getSupportedExtensions() {
            var extensions = oldGetSupportedExtensions.call(this);
            if (extensions.indexOf('OES_texture_float_linear') === -1) {
                extensions.push('OES_texture_float_linear');
            }
            return extensions;
        }

        // 获取WebGL上下文
        try {
            var gl = document.createElement('canvas').getContext('experimental-webgl');
        } catch (e) {}

        // 如果浏览器已经支持或没有WebGL，请不要安装polyfill
        if (!gl || gl.getSupportedExtensions().indexOf('OES_texture_float_linear') !== -1) {
            return;
        }

        // 如果线性滤镜适用于浮点textures，请安装polyfill 
        if (supportsOESTextureFloatLinear(gl)) {
            var oldGetExtension = WebGLRenderingContext.prototype.getExtension;
            var oldGetSupportedExtensions = WebGLRenderingContext.prototype.getSupportedExtensions;
            WebGLRenderingContext.prototype.getExtension = getExtension;
            WebGLRenderingContext.prototype.getSupportedExtensions = getSupportedExtensions;
        }
    }());

    exports.canvas = function() {
        var canvas = document.createElement('canvas');
        try {
            gl = canvas.getContext('experimental-webgl', { premultipliedAlpha: false,preserveDrawingBuffer:true});
        } catch (e) {
            gl = null;
        }
        if (!gl) {
            throw 'This browser does not support WebGL';
        }
        canvas._ = {
            gl: gl,
            isInitialized: false,
            texture: null,
            spareTexture: null,
            flippedShader: null
        };

        // 核心方法
        canvas.texture = wrap(texture);
        canvas.draw = wrap(draw);
        canvas.update = wrap(update);
        canvas.replace = wrap(replace);
        canvas.contents = wrap(contents);
        canvas.getPixelArray = wrap(getPixelArray);

        // 滤镜方法
        canvas.brightnesscontrastSaturationBur = wrap(brightnesscontrastSaturationBur);
        canvas.hueColor = wrap(hueColor);

        return canvas;
    };
    // exports.splineInterpolate = splineInterpolate;

    var Shader = (function() {
        function isArray(obj) {
            return Object.prototype.toString.call(obj) == '[object Array]';
        }

        function isNumber(obj) {
            return Object.prototype.toString.call(obj) == '[object Number]';
        }

        function compileSource(type, source) {
            var shader = gl.createShader(type);
            gl.shaderSource(shader, source);
            gl.compileShader(shader);
            if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
                throw 'compile error: ' + gl.getShaderInfoLog(shader);
            }
            return shader;
        }

        var defaultVertexSource = '\
	    attribute vec2 vertex;\
	    attribute vec2 _texCoord;\
	    varying vec2 texCoord;\
	    void main() {\
	        texCoord = _texCoord;\
	        gl_Position = vec4(vertex * 2.0 - 1.0, 0.0, 1.0);\
	    }';

        var defaultFragmentSource = '\
	    uniform sampler2D texture;\
	    varying vec2 texCoord;\
	    void main() {\
	        gl_FragColor = texture2D(texture, texCoord);\
	    }';

        function Shader(vertexSource, fragmentSource) {
            this.vertexAttribute = null;
            this.texCoordAttribute = null;
            this.program = gl.createProgram();
            vertexSource = vertexSource || defaultVertexSource;
            fragmentSource = fragmentSource || defaultFragmentSource;
            fragmentSource = 'precision highp float;' + fragmentSource; // annoying requirement is annoying
            gl.attachShader(this.program, compileSource(gl.VERTEX_SHADER, vertexSource));
            gl.attachShader(this.program, compileSource(gl.FRAGMENT_SHADER, fragmentSource));
            gl.linkProgram(this.program);
            if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
                throw 'link error: ' + gl.getProgramInfoLog(this.program);
            }
        }

        Shader.prototype.destroy = function() {
            gl.deleteProgram(this.program);
            this.program = null;
        };

        Shader.prototype.uniforms = function(uniforms) {
            gl.useProgram(this.program);
            for (var name in uniforms) {
                if (!uniforms.hasOwnProperty(name)) continue;
                var location = gl.getUniformLocation(this.program, name);
                if (location === null) continue; // will be null if the uniform isn't used in the shader
                var value = uniforms[name];
                if (isArray(value)) {
                    switch (value.length) {
                        case 1:
                            gl.uniform1fv(location, new Float32Array(value));
                            break;
                        case 2:
                            gl.uniform2fv(location, new Float32Array(value));
                            break;
                        case 3:
                            gl.uniform3fv(location, new Float32Array(value));
                            break;
                        case 4:
                            gl.uniform4fv(location, new Float32Array(value));
                            break;
                        case 9:
                            gl.uniformMatrix3fv(location, false, new Float32Array(value));
                            break;
                        case 16:
                            gl.uniformMatrix4fv(location, false, new Float32Array(value));
                            break;
                        default:
                            throw 'dont\'t know how to load uniform "' + name + '" of length ' + value.length;
                    }
                } else if (isNumber(value)) {
                    gl.uniform1f(location, value);
                } else {
                    throw 'attempted to set uniform "' + name + '" to invalid value ' + (value || 'undefined').toString();
                }
            }
            // 允许链式操作
            return this;
        };

        // textures 也是均匀的，但由于某些原因不能由gl.uniform1f指定，即使浮点数表示整数0到7
        Shader.prototype.textures = function(textures) {
            gl.useProgram(this.program);
            for (var name in textures) {
                if (!textures.hasOwnProperty(name)) continue;
                gl.uniform1i(gl.getUniformLocation(this.program, name), textures[name]);
            }
            // 允许链式操作
            return this;
        };

        Shader.prototype.drawRect = function(left, top, right, bottom) {
            var undefined;
            var viewport = gl.getParameter(gl.VIEWPORT);
            top = top !== undefined ? (top - viewport[1]) / viewport[3] : 0;
            left = left !== undefined ? (left - viewport[0]) / viewport[2] : 0;
            right = right !== undefined ? (right - viewport[0]) / viewport[2] : 1;
            bottom = bottom !== undefined ? (bottom - viewport[1]) / viewport[3] : 1;
            if (gl.vertexBuffer == null) {
                gl.vertexBuffer = gl.createBuffer();
            }
            gl.bindBuffer(gl.ARRAY_BUFFER, gl.vertexBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([left, top, left, bottom, right, top, right, bottom]), gl.STATIC_DRAW);
            if (gl.texCoordBuffer == null) {
                gl.texCoordBuffer = gl.createBuffer();
                gl.bindBuffer(gl.ARRAY_BUFFER, gl.texCoordBuffer);
                gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0, 0, 1, 1, 0, 1, 1]), gl.STATIC_DRAW);
            }
            if (this.vertexAttribute == null) {
                this.vertexAttribute = gl.getAttribLocation(this.program, 'vertex');
                gl.enableVertexAttribArray(this.vertexAttribute);
            }
            if (this.texCoordAttribute == null) {
                this.texCoordAttribute = gl.getAttribLocation(this.program, '_texCoord');
                gl.enableVertexAttribArray(this.texCoordAttribute);
            }
            gl.useProgram(this.program);
            gl.bindBuffer(gl.ARRAY_BUFFER, gl.vertexBuffer);
            gl.vertexAttribPointer(this.vertexAttribute, 2, gl.FLOAT, false, 0, 0);
            gl.bindBuffer(gl.ARRAY_BUFFER, gl.texCoordBuffer);
            gl.vertexAttribPointer(this.texCoordAttribute, 2, gl.FLOAT, false, 0, 0);
            gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        };

        Shader.getDefaultShader = function() {
            gl.defaultShader = gl.defaultShader || new Shader();
            return gl.defaultShader;
        };

        return Shader;
    })();

    function SplineInterpolator(points) {
        var n = points.length;
        this.xa = [];
        this.ya = [];
        this.u = [];
        this.y2 = [];

        points.sort(function(a, b) {
            return a[0] - b[0];
        });
        for (var i = 0; i < n; i++) {
            this.xa.push(points[i][0]);
            this.ya.push(points[i][1]);
        }

        this.u[0] = 0;
        this.y2[0] = 0;

        for (var i = 1; i < n - 1; ++i) {
            //这是三角算法的分解循环。
            // y2和u用于分解因子的临时存储。
            var wx = this.xa[i + 1] - this.xa[i - 1];
            var sig = (this.xa[i] - this.xa[i - 1]) / wx;
            var p = sig * this.y2[i - 1] + 2.0;

            this.y2[i] = (sig - 1.0) / p;

            var ddydx =
                (this.ya[i + 1] - this.ya[i]) / (this.xa[i + 1] - this.xa[i]) -
                (this.ya[i] - this.ya[i - 1]) / (this.xa[i] - this.xa[i - 1]);

            this.u[i] = (6.0 * ddydx / wx - sig * this.u[i - 1]) / p;
        }

        this.y2[n - 1] = 0;

        // 这是三对角算法的背取代循环
        for (var i = n - 2; i >= 0; --i) {
            this.y2[i] = this.y2[i] * this.y2[i + 1] + this.u[i];
        }
    }
    SplineInterpolator.prototype.interpolate = function(x) {
        var n = this.ya.length;
        var klo = 0;
        var khi = n - 1;

        // We will find the right place in the table by means of
        // bisection. This is optimal if sequential calls to this
        // routine are at random values of x. If sequential calls
        // are in order, and closely spaced, one would do better
        // to store previous values of klo and khi.
        // 我们将通过二分法在表中找到正确的地方。 如果对此例程的顺序调用是随机值x，这是最佳的。 如果顺序调用是有序的，并且紧密间隔，则可以更好地存储klo和khi的先前值。
        while (khi - klo > 1) {
            var k = (khi + klo) >> 1;

            if (this.xa[k] > x) {
                khi = k;
            } else {
                klo = k;
            }
        }

        var h = this.xa[khi] - this.xa[klo];
        var a = (this.xa[khi] - x) / h;
        var b = (x - this.xa[klo]) / h;

        // 现在评估立方样条多项式Cubic spline polynomial is now evaluated.
        return a * this.ya[klo] + b * this.ya[khi] +
            ((a * a * a - a) * this.y2[klo] + (b * b * b - b) * this.y2[khi]) * (h * h) / 6.0;
    };

    var Texture = (function() {
        Texture.fromElement = function(element) {
            var texture = new Texture(0, 0, gl.RGBA, gl.UNSIGNED_BYTE);
            texture.loadContentsOf(element);
            return texture;
        };

        function Texture(width, height, format, type) {
            this.gl = gl;
            this.id = gl.createTexture();
            this.width = width;
            this.height = height;
            this.format = format;
            this.type = type;

            gl.bindTexture(gl.TEXTURE_2D, this.id);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            if (width && height) gl.texImage2D(gl.TEXTURE_2D, 0, this.format, width, height, 0, this.format, this.type, null);
        }

        Texture.prototype.loadContentsOf = function(element) {
            this.width = element.width || element.videoWidth;
            this.height = element.height || element.videoHeight;
            gl.bindTexture(gl.TEXTURE_2D, this.id);
            gl.texImage2D(gl.TEXTURE_2D, 0, this.format, this.format, this.type, element);
        };

        Texture.prototype.initFromBytes = function(width, height, data) {
            this.width = width;
            this.height = height;
            this.format = gl.RGBA;
            this.type = gl.UNSIGNED_BYTE;
            gl.bindTexture(gl.TEXTURE_2D, this.id);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, this.type, new Uint8Array(data));
        };

        Texture.prototype.destroy = function() {
            gl.deleteTexture(this.id);
            this.id = null;
        };

        Texture.prototype.use = function(unit) {
            gl.activeTexture(gl.TEXTURE0 + (unit || 0));
            gl.bindTexture(gl.TEXTURE_2D, this.id);
        };

        Texture.prototype.unuse = function(unit) {
            gl.activeTexture(gl.TEXTURE0 + (unit || 0));
            gl.bindTexture(gl.TEXTURE_2D, null);
        };

        Texture.prototype.ensureFormat = function(width, height, format, type) {
            // 允许传递现有的texture而不是单个参数
            if (arguments.length == 1) {
                var texture = arguments[0];
                width = texture.width;
                height = texture.height;
                format = texture.format;
                type = texture.type;
            }

            // 仅在需要时更改格式
            if (width != this.width || height != this.height || format != this.format || type != this.type) {
                this.width = width;
                this.height = height;
                this.format = format;
                this.type = type;
                gl.bindTexture(gl.TEXTURE_2D, this.id);
                gl.texImage2D(gl.TEXTURE_2D, 0, this.format, width, height, 0, this.format, this.type, null);
            }
        };

        Texture.prototype.drawTo = function(callback) {
            // 开始渲染 texture
            gl.framebuffer = gl.framebuffer || gl.createFramebuffer();
            gl.bindFramebuffer(gl.FRAMEBUFFER, gl.framebuffer);
            gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.id, 0);
            if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
                throw new Error('incomplete framebuffer');
            }
            gl.viewport(0, 0, this.width, this.height);

            // do the drawing
            callback();

            // 停止渲染 texture
            gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        };

        var canvas = null;

        function getCanvas(texture) {
            if (canvas == null) {
                canvas = document.createElement('canvas');
            }
            canvas.width = texture.width;
            canvas.height = texture.height;
            var c = canvas.getContext('2d');
            c.clearRect(0, 0, canvas.width, canvas.height);
            return c;
        }

        Texture.prototype.fillUsingCanvas = function(callback) {
            callback(getCanvas(this));
            this.format = gl.RGBA;
            this.type = gl.UNSIGNED_BYTE;
            gl.bindTexture(gl.TEXTURE_2D, this.id);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
            return this;
        };

        Texture.prototype.toImage = function(image) {
            this.use();
            Shader.getDefaultShader().drawRect();
            var size = this.width * this.height * 4;
            var pixels = new Uint8Array(size);
            var c = getCanvas(this);
            var data = c.createImageData(this.width, this.height);
            gl.readPixels(0, 0, this.width, this.height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
            for (var i = 0; i < size; i++) {
                data.data[i] = pixels[i];
            }
            c.putImageData(data, 0, 0);
            image.src = canvas.toDataURL();
        };

        Texture.prototype.swapWith = function(other) {
            var temp;
            temp = other.id;
            other.id = this.id;
            this.id = temp;
            temp = other.width;
            other.width = this.width;
            this.width = temp;
            temp = other.height;
            other.height = this.height;
            this.height = temp;
            temp = other.format;
            other.format = this.format;
            this.format = temp;
        };

        return Texture;
    })();

    // 返回一个 0 到 1的随机数
    var randomShaderFunc = '\
	    float random(vec3 scale, float seed) {\
	        /* use the fragment position for a different seed per-pixel */\
	        return fract(sin(dot(gl_FragCoord.xyz + seed, scale)) * 43758.5453 + seed);\
	    }\
	';

    return exports;

}();
