import { defineConfig } from "tsdown"

export default defineConfig({
    entry: ['./src/index.ts'], 
    clean: true, 
    outDir: 'build', 
    target: 'ES2022',
    format: 'esm', 
    sourcemap: true, 
    minify: true, 
    dts: true, 
})