export default Bun.build({
    entrypoints: ['./src/index.ts'],
    target: 'node', 
    outdir: 'build',
    minify: true,
    splitting: true,
    sourcemap: true,
    
})