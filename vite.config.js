import { defineConfig } from 'vite';

export default defineConfig({
  base: process.env.GITHUB_ACTIONS
    ? `/${process.env.GITHUB_REPOSITORY.split('/').at(-1)}/`
    : '/',
});
