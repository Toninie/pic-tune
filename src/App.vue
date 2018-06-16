<template>
    <div id="test">
        <!-- 操作按键栏 -->
        <div class="image-operate">
            <el-upload
                action=""
                :auto-upload="false"
                :show-file-list="false"
                accept="image/*"
                :on-change="onFileChange">
                <el-button class="icon-image" type="primary"></el-button>
            </el-upload>
            <el-button class="icon-save" type="primary" @click="save"></el-button>
            <set-crop :editor="editor"></set-crop>
            <set-rotate :editor="editor"></set-rotate>
            <set-base :editor="editor"></set-base>
            <set-color :editor="editor"></set-color>
            <set-draw :editor="editor"></set-draw>
            <set-text :editor="editor"></set-text>
        </div>
        <div ref="image-editor"></div>
    </div>
</template>

<script>
import setCrop from './components/crop';
import setRotate from './components/rotate';
import setBase from './components/base';
import setColor from './components/color';
import setDraw from './components/draw';
import setText from './components/text';

import PicTune from './picTune/index.js';

export default {
    name: 'test',
    components: {
        setCrop,
        setRotate,
        setBase,
        setColor,
        setDraw,
        setText
    },
    data() {
        return {
            editor: null
        }
    },
    methods: {
        onFileChange (e) {
            const file = e.raw;

            this.editor.loadAsFile(file);
        },
        save () {
            this.editor.download();
        }
    },
    mounted() {
        this.editor = new PicTune({
            element: this.$refs['image-editor'],
            height: '545px',
            url: 'static/images/demo.jpg',
            onMovingCrop: () => {
                
            },
        });
    }
}
</script>

<style>
* {
    padding: 0;
    margin: 0;
}

.image-operate {
    position: relative;
    background-color: #eee;
    padding: 10px;
    white-space: nowrap;
    overflow: auto;
}

.image-operate > * {
    display: inline-block;
    margin: 0 5px;
}

.el-popover li {
    position: relative;
    display: block;
    cursor: pointer;
    line-height: 40px;
    padding: 0 10px;
}

.el-popover li:hover {
    background-color: #ecf5ff;
}

.el-popover li > p {
    line-height: 20px;
}

.el-popover li > p.right {
    position: absolute;
    right: 10px;
    top: 0;
}

.el-popover > p {
    text-align: center;
}

.color-slider {
    position: absolute;
    width: calc(100% - 20px);
    height: 6px;
    top: calc(67% - 3px);
    background-image: url(assets/hueSlider.jpg);
    background-repeat: no-repeat;
    background-size: 100% 100%;
}

.color-slider.green-red{
    background-image: url(assets/greenRedSlider.jpg);
}

.color-slider.purple-green{
    background-image: url(assets/purpleGreenSlider.jpg);
}

.color-slider.yellow-blue{
    background-image: url(assets/yellowBlueSlider.jpg);
}
</style>
