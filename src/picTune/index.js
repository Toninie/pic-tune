import './main.css';
import { scale } from './scale.js';
import { fx } from './glfx.js';
import { http, turnOver, runFunction, convertDataurlToBlob } from './utils';

// 裁剪框的一对边框所占像素
const BORDER_PIX = 4;

// 图片缓存，用于撤销修改
const CACHES = [];

/**
 * 绑定事件
 * @param  {Object} editorObj 编辑器对象 
 * @return 无
 */
function bindEvents( editorObj ) {
    const wrapper = editorObj.wrapper;
    const source = editorObj.source;
    const picture = editorObj.picture;
    const showImage = editorObj.showImage;
    const canvas = editorObj.canvas;
    const crop = editorObj.crop;
    const text = editorObj.text;
    const textOperate = text.getElementsByClassName('editor-text-operate')[0];

    let isMove = false,
        isResize = false,
        isDraw = false,
        isText = false,
        maxPos = {
            left: 0,
            top: 0,
            width: 0,
            height: 0
        },
        curPoint = "",
        moveTimer = 0;

    const movePoints = crop.getElementsByTagName('div');
    const pointDirection = ['lt', 'rt', 'lb', 'rb'];

    crop.onmousedown = moveStart;
    crop.addEventListener('touchstart', moveStart, false);

    canvas.onmousedown = moveStart;
    canvas.onmousemove = drawing;
    canvas.addEventListener('touchstart', moveStart, false);
    canvas.addEventListener('touchmove', drawing, false);

    textOperate.onmousedown = moveStart;
    textOperate.onclick = ( e ) => {
        switch ( e.target.className ) {
            case 'editor-text-confirm':
                editorObj.commitText();
                break;
            case 'editor-text-cancel':
                editorObj.toggleText(false);
                break;
        }
    }
    textOperate.addEventListener('touchstart', moveStart, false);

    wrapper.onmousemove = moveing;
    wrapper.onmouseup = moveEnd;
    wrapper.addEventListener('touchmove', moveing, false);
    wrapper.addEventListener('touchend', moveEnd, false);

    const curPos = {
        pageLeft: 0,
        pageTop: 0,
        pageX: 0,
        pageY: 0
    };

    const drawPoint = [];

    function updatePos ( e ) {
        let isTouch = !!e.type.match('touch');

        if ( isTouch ) e = e.touches[0];

        curPos.movementX = e.pageX - curPos.pageX;
        curPos.movementY = e.pageY - curPos.pageY;

        curPos.pageX = e.pageX;
        curPos.pageY = e.pageY;
    }

    function drawing( e ) {
        if ( !isDraw || !editorObj.drawable ) return;

        drawPoint.push([curPos.pageX - curPos.pageLeft, curPos.pageY - curPos.pageTop]);
        updatePos(e);

        if ( drawPoint.length > 2 ) {
            editorObj.draw(drawPoint);
            drawPoint.shift();
        }
    }

    function moveStart ( e ) {
        let target = e.target;

        maxPos.left = source.clientWidth - (crop.offsetWidth);
        maxPos.top = source.clientHeight - (crop.offsetHeight);
        maxPos.width = source.clientWidth,
        maxPos.height = source.clientHeight;
        isMove = true;

        updatePos(e);

        switch ( target ) {
            case canvas:
                isDraw = true;
                isMove = false; 
                break;
            case textOperate:
                isText = true;
                isMove = false;
                break;
            default:
                for ( let i = 0, len = movePoints.length; i < len; ++i ) {
                    if ( movePoints[i] === target ) {
                        curPoint = pointDirection[i];
                        isMove = false;
                        isResize = true;
                        break;
                    }
                }
        }

        clearTimeout(moveTimer);
        moveTimer = setTimeout(moveEnd, 1000);
    }

    function moveing ( e ) {
        updatePos(e);

        let cropStyle = crop.style,
            movementX = curPos.movementX,
            movementY = curPos.movementY,
            offsetLeft = crop.offsetLeft,
            offsetTop = crop.offsetTop,
            newLeft, newTop, newWidth, newHeight;

        const cropRate = editorObj.cropRate;

        if ( isMove ) {// 移动
            newLeft = offsetLeft + movementX;
            newTop = offsetTop + movementY;

            newLeft = newLeft < 0 ? 0 : (newLeft > maxPos.left ? maxPos.left : newLeft);
            newTop = newTop < 0 ? 0 : (newTop > maxPos.top ? maxPos.top : newTop);

            if ( newLeft != offsetLeft ) cropStyle.left = newLeft + "px";
            if ( newTop != offsetTop ) cropStyle.top = newTop + "px";

            runFunction(editorObj.onMovingCrop, editorObj, []);
        } else if ( isResize ) {// 修改尺寸
            let offsetWidth = crop.offsetWidth,
                offsetHeight = crop.offsetHeight;

            if ( cropRate ) {
                let sign = (curPoint == 'lt' || curPoint == "rb") ? 1 : -1;

                if ( cropRate > 1 ) {
                    movementX = sign * movementY * cropRate;
                } else {
                    movementY = sign * movementX / cropRate;
                }
            }

            // 判断左右
            if ( curPoint.indexOf("l") != -1 ) {
                newLeft = offsetLeft + movementX;
                newWidth = offsetWidth - movementX;

                if ( newLeft < 0 ) {
                    newWidth = newWidth + newLeft;
                    newLeft = 0;

                    if ( cropRate ) {
                        newHeight = (newWidth - BORDER_PIX) / cropRate + BORDER_PIX;
                    }
                }

            } else {
                newWidth = offsetWidth + movementX;

                if ( newWidth + offsetLeft > maxPos.width ) {
                    newWidth = maxPos.width - offsetLeft;

                    if ( cropRate ) {
                        newHeight = (newWidth - BORDER_PIX) / cropRate + BORDER_PIX;
                    }
                }
            }

            // 判断上下
            if ( curPoint.indexOf("t") != -1 && !newHeight ) {
                newTop = offsetTop + movementY;
                newHeight = offsetHeight - movementY;

                if ( newTop < 0 ) {
                    newHeight = newHeight + newTop;
                    newTop = 0;

                    if ( cropRate ) {
                        newWidth = (newHeight - BORDER_PIX) * cropRate + BORDER_PIX;
                    }
                }
            } else if ( !newHeight ) {
                newHeight = offsetHeight + movementY;

                if ( newHeight + offsetTop > maxPos.height ) {
                    newHeight = maxPos.height - offsetTop;

                    if ( cropRate ) {
                        newWidth = (newHeight - BORDER_PIX) * cropRate + BORDER_PIX;
                    }
                }
            }

            if ( isNaN(newLeft) ) newLeft =  offsetLeft;
            if ( isNaN(newTop) ) newTop = offsetTop;

            if ( cropRate ) {
                if ( newLeft + newWidth < maxPos.width ) {
                    newHeight = (newWidth - BORDER_PIX) / cropRate + BORDER_PIX;
                } else if ( newTop + newHeight < maxPos.height ) {
                    newWidth = (newHeight - BORDER_PIX) * cropRate + BORDER_PIX;
                }
            }

            if ( newLeft != offsetLeft ) cropStyle.left = newLeft + "px";
            if ( newTop != offsetTop ) cropStyle.top = newTop + "px";
            if ( newWidth != offsetWidth ) cropStyle.width = newWidth + "px";
            if ( newHeight != offsetHeight ) cropStyle.height = newHeight + "px";

            runFunction(editorObj.onMovingCrop, editorObj, []);
        } else if ( isText ) {
            let newLeft = text.offsetLeft + curPos.movementX,
                newTop = text.offsetTop + curPos.movementY;

            if ( newLeft < 0 ) {
                newLeft = 0;
            } else if ( newLeft + text.offsetWidth > maxPos.width ) {
                newLeft = maxPos.width - text.offsetWidth;
            }

            if ( newTop < 0 ) {
                newTop = 0;
            } else if ( newTop + text.offsetHeight > maxPos.height ) {
                newTop = maxPos.height - text.offsetHeight;
            }

            text.style.left = newLeft + 'px';
            text.style.top = newTop + 'px';
        }

        clearTimeout(moveTimer);
        moveTimer = setTimeout(moveEnd, 1000);
    }

    function moveEnd () {
        if ( isDraw ) {
            editorObj.confirm();
            drawPoint.length = 0;
        }

        isMove = false;
        isResize = false;
        isDraw = false;
        isText = false;

        clearTimeout(moveTimer);
    }

    picture.onload = function ( e ) {
        adjustSize();

        crop.style.display = "none";

        canvas.draw(canvas.texture(this)).update();
    }

    picture.error = function ( e ) {
        console.log(e);
    }

    window.onresize = function ( e ) {
        adjustSize ();
    }

    function adjustSize () {
        let pWidth = picture.width,
            pHeight = picture.height,
            pRate = parseFloat((pWidth / pHeight).toFixed(2));

        let sStyle = source.style,
            cStyle = crop.style;

        sStyle.width = pWidth + BORDER_PIX + "px";
        sStyle.height = pHeight + BORDER_PIX + "px";

        let sWidth = source.clientWidth - BORDER_PIX,
            sHeight = source.clientHeight - BORDER_PIX,
            sRate = parseFloat((sWidth / sHeight).toFixed(2));

        // 如果外层宽高比例与图片不一致，则需要校正
        if ( pRate != sRate ) {
            if ( sRate > pRate ) {
                sStyle.width = sHeight * pRate + BORDER_PIX + "px";
            } else {
                sStyle.height = sWidth / pRate + BORDER_PIX + "px";
            }
        }

        curPos.pageTop = getTop(canvas);
        curPos.pageLeft = getLeft(canvas);

        if ( cStyle.display == 'block' ) {
            const cropRate = editorObj.cropRate;

            cStyle.left = cStyle.top = 0;
            cStyle.width = cStyle.height = "100%";

            if ( cropRate && pRate != cropRate ) {
                if ( pRate > cropRate ) {
                    cStyle.width = crop.clientHeight * cropRate + BORDER_PIX + 'px';
                } else {
                    cStyle.height = crop.clientWidth / cropRate + BORDER_PIX + 'px';
                }
            }

            runFunction(editorObj.onMovingCrop, editorObj, []);
        }
    }

    function getTop ( e ) { 
        let offset = e.offsetTop; 
        if ( e.offsetParent ) offset += getTop(e.offsetParent);
        return offset; 
    } 

    function getLeft ( e ){ 
        let offset=e.offsetLeft; 
        if ( e.offsetParent ) offset += getLeft(e.offsetParent); 
        return offset; 
    }
}

export default class PicTune {
    constructor(options = {}) {
        Object.assign(this, {
            id: '',
            element: '',
            width: '',
            height: '400px',
            url: '',
            output: '',
            file: {},
            lineStyle: {
                width: 1,
                color: '#000',
                join: 'round'
            },
            version: -1,
            drawable: false,
            onMovingCrop () {},
        }, options);

        const wrapper = this.element || document.getElementById(this.id);
        const source = document.createElement('div');
        const picture = document.createElement('img');
        const showImage = document.createElement('img');
        const canvas = fx.canvas();
        const text = document.createElement('div');
        const crop = document.createElement('div');
        const originImage = new Image();

        this.wrapper = wrapper;
        this.source = source;
        this.picture = picture;
        this.showImage = showImage;
        this.canvas = canvas;
        this.text = text;
        this.crop = crop;
        this.originImage = originImage;

        wrapper.className = 'image-editor-wrapper';

        source.className = 'image-editor-source';

        picture.className = 'image-editor-picture';

        showImage.className = 'image-editor-show';

        canvas.className = 'image-editor-canvas';
        canvas.innerText = '你的浏览器不支持HTML5.';
        
        text.className = 'image-editor-text';
        text.style.display = "none";
        text.innerHTML = 
            '<div class="editor-text-content" contentEditable="true"></div>' + 
            '<div class="editor-text-operate">' +
                '<div class="editor-text-cancel">×</div>' + 
                '<div class="editor-text-confirm">✔</div>' + 
            '</div>';

        crop.className = 'image-editor-crop';
        crop.style.display = "none";
        crop.innerHTML = 
            '<div class="editor-crop-left editor-crop-top"></div>' +
            '<div class="editor-crop-right editor-crop-top"></div>' +
            '<div class="editor-crop-left editor-crop-bottom"></div>' +
            '<div class="editor-crop-right editor-crop-bottom"></div>';

        source.appendChild(picture);
        source.appendChild(showImage);
        source.appendChild(canvas);
        source.appendChild(text);
        source.appendChild(crop);

        wrapper.appendChild(source);

        if ( this.width ) wrapper.style.width = this.width;
        if ( this.height ) {
            wrapper.style.height = this.height;
            wrapper.style['line-height'] = this.height;
        }

        bindEvents(this);

        if ( options.url ) this.loadAsUrl( options.url );
    }

    /**
     * 加载图片http路径
     * @param  {String} url http路径字符串
     * @return {Object}     Promise对象
     */
    loadAsUrl ( url ) {
        return http.get({
                url: url,
                type: 'blob'
            })
            .then(data => this.loadAsFile(data));

    }

    /**
     * 加载图片数据
     * @param  {Object} file 图片的blob数据
     * @return {Object}      Promise对象
     */
    loadAsFile ( file ) {
        const fr = new FileReader();
        const p = new Promise((resolve, reject) => {
            fr.onload = ( e ) => {
                CACHES.length = 0;
                this.version = -1;

                this.confirm(fr.result);
                this.file = file;

                this.canvas.style.opacity = file.type == "image/gif" ? 0 : 1;

                resolve(fr.result);
            };

        });

        fr.readAsDataURL(file);

        return p;
    }

    /**
     * 确认修改
     * @param  {String} dataurl 图片数据路径
     * @return 无
     */
    confirm ( dataurl ) {
        dataurl = dataurl || this.canvas.toDataURL(this.output || this.file.type);

        if ( this.version > -1 ) {
            CACHES.length = this.version + 1;
            this.version = -1;
        }

        CACHES.push(dataurl);

        this.picture.src = dataurl;
        this.originImage.src = dataurl;
        this.showImage.src = dataurl;
    }

    /**
     * 还原修改
     * @return 无
     */
    reset () {
        this.picture.src = this.originImage.src;
        this.text.style.display = 'none';
    }

    /**
     * 跳转到某一步的修改
     * @param  {String} idx 具体某一步的索引，或者"+"代表下一步，"-"代表上一步
     * @return 无
     */
    skip ( idx ) {
        let dataurl;

        switch ( idx ) {
            case "+":
                if ( this.version !== -1 && ++ this.version < CACHES.length ) dataurl = CACHES[this.version];

                if ( this.version === CACHES.length ) this.version = -1;
                break;
            case "-":
                if ( this.version > 0 ) {
                    -- this.version;
                } else if ( CACHES.length > 1 ) {
                    this.version = CACHES.length - 2;
                }

                dataurl = CACHES[this.version];
                break;
            default:
                dataurl = CACHES[idx];
        }

        if ( dataurl ) {
            this.picture.src = dataurl;
            this.originImage.src = dataurl;
            this.showImage.src = dataurl;
        }
    }

    /**
     * 获取当前图片尺寸
     * @return {Object} 尺寸数据
     */
    getSize () {
        const canvas = this.canvas;

        return {
            width: canvas.width,
            height: canvas.height
        }
    }

    /**
     * 切换裁切框的显示/隐藏
     * @param  {Boolean} toggle 显示/隐藏
     * @param  {Number}  rate   比例
     * @return {Boolean}        显示/隐藏
     */
    toggleCrop ( toggle, rate ) {
        const crop = this.crop;
        const cropRate = this.cropRate = parseFloat((rate || 0).toFixed(2));

        let cStyle = crop.style,
            isShow = cStyle.display == "block";

        if ( typeof toggle == "undefined" ) {
            toggle = !isShow;
        }

        if ( toggle ) this.canvas.style.opacity = 1;

        cStyle.display = toggle ? "block" : "none";
        cStyle.left = cStyle.top = 0;
        cStyle.width = cStyle.height = "100%";

        if ( toggle && cropRate ) {
            let cWidth = crop.clientWidth,
                cHeight = crop.clientHeight,
                curRate = parseFloat((cWidth / cHeight).toFixed(2));

            if ( curRate != cropRate ) {
                if ( curRate > cropRate ) {
                    cStyle.width = cHeight * cropRate + BORDER_PIX + 'px';
                } else {
                    cStyle.height = cWidth / cropRate + BORDER_PIX + 'px';
                }
            }
        }

        return toggle;
    }

    /**
     * 获取图片的2D canvas
     * @param  {Number} left   左偏移
     * @param  {Number} top    上偏移
     * @param  {Number} width  宽度
     * @param  {Number} height 高度
     * @return {Object}        2D canvas对象
     */
    get2dCanvas(left = 0, top = 0, width, height) {
        const c = document.createElement('canvas');
        const picture = this.picture;

        width = width || picture.width;
        height = height || picture.height;

        c.width = width;
        c.height = height;

        c.getContext('2d').drawImage(picture, left, top, width, height, 0, 0, width, height);

        return c;
    }

    /**
     * 裁切框当前位置
     * @return {Object} 位置信息
     */
    getCropPosition () {
        const crop = this.crop;
        const rate = this.picture.height / this.canvas.clientHeight;

        if ( crop.style.display == 'none' ) {
            return {
                top: 0,
                left: 0,
                height: this.picture.height,
                width: this.picture.width
            }
        } else {
            return {
                top: parseInt(crop.offsetTop * rate),
                left: parseInt(crop.offsetLeft * rate),
                height: parseInt((crop.offsetHeight - BORDER_PIX) * rate),
                width: parseInt((crop.offsetWidth - BORDER_PIX) * rate)
            }
        }
    }

    /**
     * 确认裁切
     */
    setCrop () {
        const postion = this.getCropPosition();

        this.confirm(this.get2dCanvas(postion.left, postion.top, postion.width, postion.height).toDataURL(this.output || this.file.type));
    }

    /**
     * 旋转
     * @param  {Number}  angle      旋转的角度
     * @param  {Boolean} isTurnOver 旋转以后是否水平翻转
     */
    rotate ( angle, isTurnOver ) {
        const picture = this.picture;

        this.canvas.style.opacity = 1;

        let c = this.get2dCanvas(),
            c2 = c.getContext('2d'),
            pW = picture.width,
            pH = picture.height,
            cX = 0, 
            cY = 0,
            type;

        angle = angle % 360 + ( angle < 0 ? 360 : 0 );

        if ( angle > 0 ) {
            let A = angle * Math.PI / 180,
                sinA = Math.abs(Math.sin(A).toFixed(2)),
                cosA = Math.abs(Math.cos(A).toFixed(2));

            c.width = pH * sinA + pW * cosA;
            c.height = pH * cosA + pW * sinA;

            if ( angle <= 90 ) {
                cX = pH * sinA * cosA;
                cY = -(pH * sinA * sinA);
            } else if ( angle > 90 && angle <= 180 ) {
                cX = -(pW * cosA * cosA);
                cY = -(pW * cosA * sinA + pH);
            } else if ( angle > 180 && angle <= 270  ) {
                cX = -(pH * cosA * sinA + pW);
                cY = -(pH * cosA * cosA);
            } else {
                cX = -(pW * sinA * sinA);
                cY = -(pW * sinA * cosA);
            }


            c2.rotate(A);
        }

        c2.drawImage(picture, cX, cY);

        if ( isTurnOver ) turnOver(c, isTurnOver);

        this.confirm(c.toDataURL(this.output || this.file.type));
    }

    /**
     * 基础参数调节
     * @param  {Number} brightness 亮度 -1~1
     * @param  {Number} contrast   对比度 -1~1
     * @param  {Number} saturation 色彩饱和度 -1~1
     * @param  {Number} radius     清晰度 -10~10
     */
    base ( brightness = 0, contrast = 0, saturation = 0, radius = 0 ) {
        const canvas = this.canvas;

        this.canvas.style.opacity = 1;

        canvas.draw(canvas.texture(this.originImage)).brightnesscontrastSaturationBur([brightness, contrast, saturation, radius]).update();
    }

    /**
     * 色彩调节
     * @param  {Number} hue         色相
     * @param  {Number} greenRed    绿红
     * @param  {Number} purpleGreen 紫绿
     * @param  {Number} yellowBlue  黄蓝
     */
    huaColor ( hue = 0, greenRed = 0, purpleGreen = 0, yellowBlue = 0 ) {
        const canvas = this.canvas;

        this.canvas.style.opacity = 1;

        canvas.draw(canvas.texture(this.originImage)).hueColor([hue, greenRed, purpleGreen, yellowBlue]).update();
    }

    /**
     * 输出图像
     * @param  {Number}  width  宽度
     * @param  {Number}  height 高度
     * @param  {Boolean} isBlob 是否转为二进制数据
     * @return {Object}         图像数据
     */
    getData ( width, height, isBlob ) {
        const picture = this.picture;
        const postion = this.getCropPosition();

        let type = this.output || this.file.type,
            c = this.get2dCanvas(postion.left, postion.top, postion.width, postion.height),
            data = null;

        width = width || picture.width;
        height = height || picture.height;

        if ( width != postion.width || height != postion.height ) {
            data = scale({
                width: parseInt(width),
                height: parseInt(height),
            }, c).toDataURL(type);
        } else {
            data = c.toDataURL(type);
        }

        if ( isBlob ) data = convertDataurlToBlob(data, type);

        return data;
    }

    /**
     * 下载图像到本地
     * @param  {String}  fileName  文件名
     */
    download ( fileName ) {
        const originImage = this.originImage;

        let aLink = document.createElement('a'),
            evt = document.createEvent('MouseEvents'),
            type = (this.output || this.file.type).split("/")[1] || 'jpg',
            width = originImage.width,
            height = originImage.height;

        aLink.href = window.URL.createObjectURL(this.getData(width, height, true));
        aLink.download = fileName ? `${fileName}.${type}` : `${width}x${height}.${type}`;

        evt.initMouseEvent('click', true, false, window, 0, 0, 0, 0, 0, false, false, false, false, 0);

        aLink.dispatchEvent(evt);
    }

    /**
     * 上传图片
     * @param  {Object} params 上传参数
     * @return {Object}        Promise对象
     */
    upload ( params ) {
        let formData = new FormData(),
            formKey = params.formKey || 'fileToUpload',
            options = {
            url: params.url,
            type: 'json',
            data: formData
        };

        if ( params.isOrigin ) {
            formData.append(formKey, this.file);
        } else {
            formData.append(formKey, this.getData(params.width, params.height, true));
        }

        return http.post(options);
    }

    /**
     * 画线条
     * @param  {Array} points 坐标点数组
     * @return 无
     */
    draw ( points ) {
        const lineStyle = this.lineStyle;

        let c = this.get2dCanvas(),
            c2 = c.getContext('2d');

        c2.lineWidth = lineStyle.width;
        c2.strokeStyle = lineStyle.color;
        c2.lineJoin = lineStyle.join;

        for ( var i = 0, len = points.length; i < len - 1; ) {
            let p = points[i];
            c2.beginPath();  
            c2.moveTo(p[0],p[1]);
            p = points[++i];  
            c2.lineTo(p[0],p[1]);  
            c2.stroke();
        }

        this.picture.src = c.toDataURL(this.output || this.file.type);
    }

    /**
     * 显示/隐藏文本框
     * @param  {[type]} toggle [description]
     * @param  {[type]} style  [description]
     * @return {[type]}        [description]
     */
    toggleText ( toggle, style ) {
        const text = this.text;
        const textStyle = text.style;

        if ( toggle && textStyle.display === 'none' ) {
            text.getElementsByClassName('editor-text-content')[0].innerHTML = '';
            textStyle.left = `calc(50% - ${text.offsetWidth}px)`;
            textStyle.top = '60%';
        }

        textStyle.display = toggle ? 'block' : 'none';

        if ( style ) {
            for ( let s in style ) {
                let ss = style[s];
                textStyle[s] = ss;
                if ( s === 'font-size' ) textStyle['line-height'] = textStyle['min-height'] = ss;
            }
        }
    }

    /**
     * 确定添加文本
     * @return 无
     */
    commitText () {
        let text = this.text,
            textStyle = text.style,
            textContent = text.getElementsByClassName('editor-text-content')[0],
            content = textContent.innerText.split(/\n(?!\s*$)/g),
            picture = this.picture,
            rate = picture.height / this.canvas.clientHeight,
            textHeight = text.clientHeight * rate,
            lineHeight = textHeight / content.length,
            x = (text.offsetLeft - 1) * rate,
            y = (text.offsetTop - 5) * rate + textHeight;

        let c = this.get2dCanvas(),
            c2 = c.getContext('2d'),
            params = ['font-style', 'font-variant', 'font-weight', 'font-size', 'font-family'],
            font = [];

        for ( let i = 0, len = params.length; i < len; ++i ) {
            let p = params[i],
                s = textStyle[p];

            if ( p === 'font-size' ) s = parseInt(parseInt(s) * rate) + 'px';
            if ( s ) font.push(s);
        }

        c2.font = font.join(' ');
        c2.fillStyle = textStyle.color || '#000';

        for ( let i = content.length - 1; i >= 0; --i ) {
            c2.fillText(content[i], x, y);
            y -= lineHeight;
        }

        textStyle.display = 'none';
        this.confirm(c.toDataURL(this.output || this.file.type));
    }
}

/* istanbul ignore if */
if (typeof window !== 'undefined' && window.Vue) {
    window.PicTune = PicTune;
}