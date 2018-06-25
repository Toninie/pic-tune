import Vue from 'vue'
import ElementUI from 'element-ui'

import 'element-ui/lib/theme-chalk/index.css'
import './icon/style.css'

import App from './App.vue'
import axios from 'axios'

Vue.use(ElementUI);

const http = axios.create({})
Vue.http = http
Vue.prototype.$http = http

new Vue({
    el: '#app',
    render: h => h(App)
});
