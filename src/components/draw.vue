<template>
    <div>
        <el-popover
            ref="draw"
            width="200"
            trigger="hover">
            <div class="line-style" label="宽度">
                <el-input-number v-model="lineWidth" size="mini" :min="1"></el-input-number>
            </div>
            <div class="line-style" label="颜色">
                <el-color-picker v-model="lineColor" size="mini"></el-color-picker>
                <el-checkbox v-model="isDraw">使用</el-checkbox>
            </div>
            <p>
                <el-button type="primary" size="mini" @click="editor.confirm()">确定</el-button>
                <el-button size="mini" @click="editor.reset()">还原</el-button>
            </p>
        </el-popover>

        <el-button class="icon-pencil" type="primary" @click="isDraw = true" v-popover:draw></el-button>
    </div>
</template>

<script>
export default {
    props: ['editor'],
    data () {
        return {
            isDraw: false,
            lineWidth: 1,
            lineColor: '#000'
        }
    },
    watch: {
        isDraw ( val ) {
            this.editor.drawable = val;
        },
        lineWidth ( val ) {
            this.editor.lineStyle.width = val;
        },
        color ( val ) {
            this.editor.lineStyle.color = val;
        }
    },
    methods: {
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

.line-style > .el-checkbox {
    float: right;
    margin-right: 25px;
}
</style>