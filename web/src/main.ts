import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import router from './router';

import './styles/tokens.css';
import './styles/base.css';

// Every view imports the Naive UI components it uses, so nothing is registered globally.
const app = createApp(App);
app.use(createPinia());
app.use(router);
app.mount('#app');
