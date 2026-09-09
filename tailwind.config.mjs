/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: 'var(--color-primary)',
          hover: 'var(--color-primary-hover)',
          light: 'var(--color-primary-light)',
          contrast: 'var(--color-primary-contrast)',
        },
        header: {
          bg: 'var(--color-header-bg)',
          text: 'var(--color-header-text)',
          hover: 'var(--color-header-hover)',
        },
        footer: {
          bg: 'var(--color-footer-bg)',
          text: 'var(--color-footer-text)',
        },
        page: 'var(--color-bg-page)',
        subtle: 'var(--color-bg-subtle)',
        muted: 'var(--color-text-muted)',
      },
      fontFamily: {
        heading: ['var(--font-heading)'],
        body: ['var(--font-body)'],
      },
    },
  },
  plugins: [],
};
