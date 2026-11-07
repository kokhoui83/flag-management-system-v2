import { createApp } from 'vue';
import { createPinia } from 'pinia';
import {
  create,
  NAlert,
  NBadge,
  NButton,
  NCard,
  NConfigProvider,
  NDescriptions,
  NDescriptionsItem,
  NDivider,
  NEmpty,
  NForm,
  NFormItem,
  NGrid,
  NInput,
  NInputNumber,
  NLayout,
  NLayoutContent,
  NPageHeader,
  NPopconfirm,
  NResult,
  NRow,
  NSelect,
  NSpace,
  NSpin,
  NSwitch,
  NTable,
  NTag,
  NTabs,
  NTab,
  NTabPane,
  NText,
  NModalProvider,
  NMessageProvider,
  NNotificationProvider,
  NDialogProvider,
} from 'naive-ui';
import App from './App.vue';
import router from './router';

import 'naive-ui/es/styles';

const app = createApp(App);

// Naive UI plugin: registers the `N`-prefixed components used across the dashboard views.
const naiveApp = create({
  components: [
    NAlert,
    NBadge,
    NButton,
    NCard,
    NConfigProvider,
    NDescriptions,
    NDescriptionsItem,
    NDivider,
    NEmpty,
    NForm,
    NFormItem,
    NGrid,
    NInput,
    NInputNumber,
    NLayout,
    NLayoutContent,
    NPageHeader,
    NPopconfirm,
    NResult,
    NRow,
    NSelect,
    NSpace,
    NSpin,
    NSwitch,
    NTable,
    NTag,
    NTabs,
    NTab,
    NTabPane,
    NText,
    NModalProvider,
    NMessageProvider,
    NNotificationProvider,
    NDialogProvider,
  ],
});
app.use(naiveApp);
app.use(createPinia());
app.use(router);
app.mount('#app');
