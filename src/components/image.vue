<template>
    <div>
        <el-popover
            ref="image"
            width="600"
            trigger="hover">
            <el-upload
                action=""
                :auto-upload="false"
                :show-file-list="false"
                accept="image/*"
                :on-change="onFileChange">
                <el-button>本地图片</el-button>
            </el-upload>
            <el-checkbox v-model="isAdd">插入素材</el-checkbox>

            <el-tabs v-model="active" @tab-click="switchTabs">
                <el-tab-pane v-for="(item, key) in allList" :label="item.label" :name="key">
                    <div v-if="!item.data.length" class="image-tips">
                        <i v-bind:class="{'el-icon-loading': isLoad}"></i>
                    </div>
                    <ul v-else>
                        <li v-for="pic in item.data"
                            :title="pic.name"
                            @click="selectPic(pic)">
                            <img :src="pic.url" />
                        </li>
                        <li v-if="isLoad">
                            <i class="el-icon-loading"></i>
                        </li>
                    </ul>
                </el-tab-pane>
            </el-tabs>
            
        </el-popover>

        <el-button class="icon-image" type="primary" v-popover:image></el-button>
    </div>
</template>

<script>
export default {
    props: ['editor'],
    data () {
        return {
            isLoad: false,
            isAdd: true,
            active: 'record',
            allList: {
                record: {
                    label: '最近',
                    data: []
                },
                panda: {
                    label: '熊猫人',
                    data: [],
                    idx: 1
                },
                face: {
                    label: '表情',
                    data: [],
                    idx: 1
                }
            },
        }
    },
    methods: {
        onFileChange ( e ) {
            const file = e.raw;

            this.selectPic({url: window.URL.createObjectURL(file)});
        },
        selectPic ( pic ) {
            if ( this.isAdd ) {
                this.editor.toggleAdd(true, {src: pic.url});
            } else {
                let data = this.allList.record.data;

                data.unshift({
                    url: window.URL.createObjectURL(this.editor.getData(undefined, undefined, true)),
                    name: '图片' + Date.now()
                });
                this.editor.loadAsUrl(pic.url);
            }
        },
        switchTabs ( tab ) {
            let name = tab.name,
                curList = this.allList[name],
                curIdx = curList.idx;

            if ( name === 'record' || curIdx === -1 ) {
                this.isLoad = false;
                return;
            } else {
                this.isLoad = true;
            }

            const img = new Image();

            img.onload = () => {
                curList.data.push({
                    url: img.src,
                    name: `${tab.label}_${curIdx}`
                });

                ++ curList.idx;

                if ( this.active === name ) this.switchTabs(tab);
            }

            img.onerror = () => {
                curList.idx = -1;
                this.isLoad = false;
            }

            img.src = `static/${name}/a${curIdx}.png`;
        }
    },
    mounted() {
        
    }
}
</script>

<style scoped>
.el-popper > div:first-child {
    display: inline-block;
}

.el-checkbox {
    float: right;
    margin: 10px;
}

.image-tips {
    line-height: 100px;
    height: 100px;
    text-align: center;
}

.image-tips i:after {
    content: '暂无图片~';
}

.image-tips .el-icon-loading:after {
    content: '';
}

ul {
    display: block;
    max-height: 200px;
    overflow: auto;
    padding-top: 5px;
}

ul li {
    position: relative;
    display: inline-block;
    width: 190px;
    height: 100px;
    line-height: 100px;
    padding: 5px 0 20px 0;
    text-align: center;
    overflow: hidden;
}

 ul li:after {
    display: block;
    position: absolute;
    width: 100%;
    height: 20px;
    line-height: 20px;
    text-align: center;
    bottom: 0;
    content: attr(title);
} 

ul li img {
    max-width: 100%;
    max-height: 100%;
    vertical-align: middle;
}
</style>