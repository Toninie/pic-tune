export const Query = {
    parse ( search = window.location.search ) {
        if (!search) return {};

        const queryString = search[0] === '?' ? search.substring(1) : search;
        const query = {};

        queryString.split('&')
            .forEach(queryStr => {
                const [key, value] = queryStr.split('=');
                if (key) query[key] = value;
            });

        return query;
    },
    stringify ( query, prefix = '?' ) {
        const queryString = Object.keys(query)
            .map(key => `${key}=${encodeURIComponent(query[key] || '')}`)
            .join('&');

        return queryString ? prefix + queryString : ''
    }
}

export const http = {
    get: ajaxFactory('GET'),
    post: ajaxFactory('POST')
}

/**
 * [turnOver   图片翻转]
 * @param  {[type]} oGC  [画布2d context]
 * @param  {[type]} obj [翻转的img对象]
 * @param  {[type]} iNow [翻转标志，4水平翻转，5垂直翻转]
 * @return {[type]} [description]
 */
export function turnOver ( oC ) {
    let oGC = oC.getContext('2d'),
        oImg = oGC.getImageData(0, 0, oC.width, oC.height),
        newImg = oGC.createImageData(oC.width, oC.height);

    let w = oImg.width,
        h = oImg.height;

    for (let i = 0; i < w; i++) {

        for (let j = 0; j < h; j++) {
            let color = getXY(oImg, i, j);

            setXY(newImg, w - 1 - i, j, color);
        }
    }

    oGC.putImageData(newImg, 0, 0);
}

export function runFunction (fn, thisObj, args) {
    if (fn && typeof fn === "function") {
        var argus = arguments,
            argsl = argus.length;

        //如果函数的参数列表存在1个参数
        if (argsl == 1) {
            return fn.apply(window);
        }

        //如果函数的参数列表存在2个参数
        if (argsl == 2) {
            if (Array.isArray(thisObj)) {
                return fn.apply(window, thisObj);
            } else {
                return fn.apply(thisObj);
            }
        }

        //如果函数的参数列表存在3个参数
        if (argsl == 3) {
            return fn.apply(thisObj || window, args);
        }
    }
}

/**
 * 将以base64的图片url数据转换为Blob
 * @param  {String} urlData  用url方式表示的base64图片数据
 * @return {Object} 图片的Blob对象
 */
export function convertDataurlToBlob ( urlData, type ) {

    //去掉url的头，并转换为byte
    var bytes = window.atob(urlData.split(',')[1]);

    //处理异常,将ascii码小于0的转换为大于0
    var ab = new ArrayBuffer(bytes.length);
    var ia = new Uint8Array(ab);
    for (var i = 0; i < bytes.length; i++) {
        ia[i] = bytes.charCodeAt(i);
    }

    return new Blob([ab], {
        type: type
    });
}

function ajaxFactory ( method ) {
    return function ( options ) {
        const req = new XMLHttpRequest();

        let url = options.url,
            data = options.data,
            body = null;

        if (method === 'GET' && data) {
            url += Query.stringify(data, url.indexOf('?') == -1 ? '?' : '&');
        }

        const p = new Promise((resolve, reject) => {
            req.addEventListener('load', () => {
                const contentType = req.getResponseHeader('content-type');
                const res = req.responseType != 'text' && req.responseType != '' ? req.response : req.responseText;

                resolve(res);
            });

            req.addEventListener('error', error => reject(error));
        });

        req.open(method, url, true);

        if (method !== 'GET') {
            if ( data && data.append ) {
                body = data;
            } else {
                body = JSON.stringify(data);
                req.setRequestHeader('Content-Type', 'application/json');
            }
        }

        if (options.type) req.responseType = options.type;

        req.send(body);
        return p;
    }
}

/**
 * [getXY   获取图像点的颜色值]
 * @param  {[type]} obj  [图形对象]
 * @param  {[type]} x [x坐标]
 * @param  {[type]} y [y坐标]
 * @param  {[type]} color [颜色数组分别代表rgba]
 * @return {[type]} color [颜色数组分别代表rgba]
 */
function getXY(obj, x, y) { //针对一行一列进行操作

    let w = obj.width,
        h = obj.height,
        d = obj.data;

    let color = [];

    color[0] = d[4 * (y * w + x)];
    color[1] = d[4 * (y * w + x) + 1];
    color[2] = d[4 * (y * w + x) + 2];
    color[3] = d[4 * (y * w + x) + 3];

    return color;

}

/**
 * [setXY   设置图像点的颜色值]
 * @param  {[type]} obj  [图形对象]
 * @param  {[type]} x [x坐标]
 * @param  {[type]} y [y坐标]
 * @param  {[type]} color [颜色数组分别代表rgba]
 * @return {[type]}          [description]
 */
function setXY(obj, x, y, color) {
    let w = obj.width,
        h = obj.height,
        d = obj.data;

    d[4 * (y * w + x)] = color[0];
    d[4 * (y * w + x) + 1] = color[1];
    d[4 * (y * w + x) + 2] = color[2];
    d[4 * (y * w + x) + 3] = color[3];

}