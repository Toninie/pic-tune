<template>
    <div>
        <el-popover
            ref="color"
            width="200"
            trigger="hover">
            <ul>
                <li v-for="item in color">
                    <p>{{item.name[0]}}</p>
                    <p class="right">{{item.name[1]}}</p>
                    <el-slider v-model="item.value" :step="item.step" :min="item.limit[0]" :max="item.limit[1]" @change="colorChange"></el-slider>
                    <div :class="'color-slider ' + item.cls"></div>
                </li>
            </ul>
            <p>
                <el-button type="primary" size="mini" @click="colorConfirm(true)">确定</el-button>
                <el-button size="mini" @click="colorConfirm(false)">还原</el-button>
            </p>
        </el-popover>

        <el-button class="icon-palette" type="primary" v-popover:color></el-button>
    </div>
</template>

<script>
export default {
    props: ['editor'],
    data () {
        return {
            color: [
                {
                    name: ['色相'],
                    value: 0,
                    step: 0.1,
                    limit: [-1, 1],
                    cls: ''
                },{
                    name: ['青', '红'],
                    value: 0,
                    step: 0.1,
                    limit: [-1, 1],
                    cls: 'green-red'
                },{
                    name: ['紫', '绿'],
                    value: 0,
                    step: 0.1,
                    limit: [-1, 1],
                    cls: 'purple-green'
                },{
                    name: ['黄', '蓝'],
                    value: 0,
                    step: 0.1,
                    limit: [-1, 1],
                    cls: 'yellow-blue'
                }
            ],
        }
    },
    methods: {
        colorChange () {
            let color = this.color;

            this.editor.huaColor(color[0].value, color[1].value, color[2].value, color[3].value);
        },
        colorConfirm ( isChange ) {
            let color = this.color;

            if ( isChange ) {
                this.editor.confirm();
            } else {
                this.editor.reset();
            }

            for ( let i = 0, len = color.length; i < len; ++i ) {
                color[i].value = 0;
            }
        }
    }
}
</script>