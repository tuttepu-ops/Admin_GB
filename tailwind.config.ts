import type {Config} from 'tailwindcss';
const config:Config={content:['./app/**/*.{js,ts,jsx,tsx,mdx}','./components/**/*.{js,ts,jsx,tsx,mdx}'],theme:{extend:{colors:{forest:'#173d2b',cream:'#f6f3ea',sage:'#e8efe7',gold:'#c5a45a'},fontFamily:{serif:['Georgia','serif']}}},plugins:[]};export default config;
