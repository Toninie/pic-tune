<template>
    <div>
        <el-popover
            ref="rotate"
            width="200"
            trigger="hover">
            <ul>
                <li v-for="item in rotate" @click="setRotate(item.params)">{{item.name}}</li>
            </ul>
            <p>
                <el-button type="primary" size="mini" @click="editor.confirm()">确定</el-button>
                <el-button size="mini" @click="editor.reset()">还原</el-button>
            </p>
        </el-popover>

        <el-button class="icon-rotate" type="primary"  v-popover:rotate></el-button>
    </div>
</template>

<script>
export default {
    props: ['editor'],
    data () {
        return {
            rotate: [
                {
                    name: '向右旋转90度',
                    params: [90]
                },{
                    name: '向左旋转90度',
                    params: [-90]
                },{
                    name: '旋转180度',
                    params: [180]
                },{
                    name: '水平翻转',
                    params: [0, true]
                },{
                    name: '垂直翻转',
                    params: [180, true]
                },
            ],
        }
    },
    methods: {
        setRotate ( args ) {
            this.editor.rotate(args[0], args[1]);
        },
    }
}
</script>