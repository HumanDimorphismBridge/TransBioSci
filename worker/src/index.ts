import { createApp } from './app';
import type { Env } from './config';

const handle = createApp();

export default {
  fetch(request, env) {
    return handle(request, env);
  },
} satisfies ExportedHandler<Env>;
