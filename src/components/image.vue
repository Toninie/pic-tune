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
            <el-input v-model="keyword" prefix-icon="el-icon-search" placeholder="输入关键字搜索图片"></el-input>
            <div v-if="!showList || !showList.length" class="image-tips"><i v-bind:class="{'el-icon-loading': isLoad}"></i></div>
            <ul v-else>
                <li v-for="item in showList"
                    :title="item.name"
                    @click="editor.loadAsUrl(item.url)">
                    <img :src="item.url" />
                </li>
            </ul>
        </el-popover>

        <el-button class="icon-image" type="primary" v-popover:image></el-button>
    </div>
</template>

<script>
export default {
    props: ['editor'],
    data () {
        return {
            isLoad: true,
            keyword: '',
            allList: [],
            showList: null
        }
    },
    watch: {
        allList() {
            this.filterList();
        },
        keyword() {
            this.filterList();
        }
    },
    methods: {
        onFileChange ( e ) {
            const file = e.raw;

            this.editor
                .loadAsFile(file)
                .then((url) => {
                    this.allList.unshift({
                        url: window.URL.createObjectURL(file),
                        name: '图片' + Date.now()
                    })
                });
        },
        filterList() {
            let keyword = this.keyword,
                allList = this.allList,
                list;

            if ( keyword ) {
                list = [];

                for ( let i = 0, len = allList.length; i < len; ++i ) {
                    let row = allList[i];

                    if ( row.name.match(keyword) ) list.push(row);
                }
            } else {
                list = allList.slice(0);
            }

            this.showList = list;
        }
    },
    mounted() {
        this.$http.get(`static/meme.json?_=${Date.now()}`)
        .then(res => {
            let list = this.allList.concat(res.data || []);
            this.allList = list;

            this.isLoad = false;

            if ( list.length ) this.editor.loadAsUrl(list[0].url);
        })
        .catch(error => {
            this.isLoad = false;
            console.log(error);
        });
    }
}
</script>

<style scoped>
.el-popper > div:first-child {
    display: inline-block;
}

.el-input {
    display: inline-block;
    width: 200px;
    float: right;
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