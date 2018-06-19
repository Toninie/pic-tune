import Vue from 'vue'
import App from './App.vue'
import axios from 'axios'

import './icon/style.css'

const http = axios.create({});
Vue.http = http
Vue.prototype.$http = http

new Vue({
    el: '#app',
    render: h => h(App)
});
