<template>
    <div>
        <el-popover
            ref="base"
            width="200"
            trigger="hover">
            <ul>
                <li v-for="item in base">
                    <p>{{item.name}}</p>
                    <el-slider v-model="item.value" :step="item.step" :min="item.limit[0]" :max="item.limit[1]" @change="baseChange"></el-slider>
                </li>
            </ul>
            <p>
                <el-button type="primary" size="mini" @click="baseConfirm(true)">确定</el-button>
                <el-button size="mini" @click="baseConfirm(false)">还原</el-button>
            </p>
        </el-popover>

        <el-button class="icon-brightness-contrast" type="primary" v-popover:base></el-button>
    </div>
</template>

<script>
export default {
    props: ['editor'],
    data () {
        return {
            base: [
                {
                    name: '亮度',
                    value: 0,
                    step: 0.1,
                    limit: [-1, 1]
                },{
                    name: '对比度',
                    value: 0,
                    step: 0.1,
                    limit: [-1, 1]
                },{
                    name: '色彩饱和度',
                    value: 0,
                    step: 0.1,
                    limit: [-1, 1]
                },{
                    name: '清晰度',
                    value: 0,
                    step: 1,
                    limit: [-10, 10]
                }
            ],
        }
    },
    methods: {
        baseChange () {
            let base = this.base;

            this.editor.base(base[0].value, base[1].value, base[2].value, base[3].value);
        },
        baseConfirm ( isChange ) {
            let base = this.base;

            if ( isChange ) {
                this.editor.confirm();
            } else {
                this.editor.reset();
            }

            for ( let i = 0, len = base.length; i < len; ++i ) {
                base[i].value = 0;
            }
        },
    }
}
</script>