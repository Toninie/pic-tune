<template>
    <div>
        <el-popover
            ref="text"
            width="200"
            trigger="hover">
            <div class="line-style" label="大小">
                <el-input-number v-model="fontSize" size="mini" :min="12"></el-input-number>
            </div>
            <div class="line-style" label="字体">
                <el-select v-model="style['font-family']" size="mini">
                    <el-option 
                        v-for="font in fontFamilys"
                        :value="font">
                    </el-option>
                </el-select>
            </div>

            <div class="line-style" label="粗细">
                <el-select v-model="style['font-weight']" size="mini">
                    <el-option 
                        v-for="(val, name) in fontWeights"
                        :label="name"
                        :value="val">
                    </el-option>
                </el-select>
            </div>
            <div class="line-style" label="颜色">
                <el-color-picker v-model="style['color']" size="mini"></el-color-picker>
            </div>
        </el-popover>

        <el-button class="icon-text" type="primary" @click="showText" v-popover:text></el-button>
    </div>
</template>

<script>
export default {
    props: ['editor'],
    data () {
        return {
            fontSize: 20,
            style: {
                'font-size': '20px',
                'color': '#000',
                'font-family': '黑体',
                'font-weight': 'normal'
            },
            fontFamilys: ['黑体', '宋体', '隶书', 'arial'],
            fontWeights: {
                '减细': 'lighter',
                '普通': 'normal',
                '加粗': 'bolder'
            }
        }
    },
    watch: {
        fontSize ( val ) {
            this.style['font-size'] = val + 'px';
        },
        style: {
            handler(newVal, oldVal) {
                console.log(newVal, oldVal);
                this.editor.toggleText(true, this.style);
            },
            deep: true
        },
    },
    methods: {
        showText () {
            this.editor.toggleText(true, this.style);
        }
    }
}
</script>

<style scoped>
.line-style {
    line-height: 40px;
}

.line-style:before {
    content: attr(label) "：";
}

.line-style > * {
    vertical-align: middle;
}

.line-style .el-select {
    width: 130px;
}

.line-style > .el-checkbox {
    float: right;
    margin-right: 25px;
}
</style>