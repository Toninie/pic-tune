<template>
    <div>
        <el-popover
            ref="crop"
            width="200"
            trigger="hover">
            <el-select v-model="selectSize" placeholder="" @change="toggleCrop(true)">
                <el-option
                    v-for="size in sizeList"
                    :key="size"
                    :label="size"
                    :value="size">
                </el-option>
            </el-select>
            <el-checkbox v-model="isLockSize" @change="toggleCrop(true)">锁定剪裁比例</el-checkbox>
            <p>
                <el-button type="primary" size="mini" @click="setCrop">确定</el-button>
                <el-button size="mini" @click="editor.reset()">取消</el-button>
            </p>
        </el-popover>

        <el-button class="icon-crop" type="primary" v-popover:crop @click="toggleCrop(true)"></el-button>
    </div>
</template>

<script>
export default {
    props: ['editor'],
    data () {
        return {
            selectSize: '100x100',
            sizeList: ['100x100', '320x240', '240x320', '400x400'],
            isLockSize: true,
        }
    },
    methods: {
        toggleCrop ( toggle ) {
            let sizeArr = this.selectSize.split("x");

            toggle = !!toggle;

            if ( this.isLockSize ) {
                this.editor.toggleCrop(toggle, sizeArr[0] / sizeArr[1]);
            } else {
                this.editor.toggleCrop(toggle);
            }
        },
        setCrop () {
            this.editor.setCrop();
        },
    }
}
</script>