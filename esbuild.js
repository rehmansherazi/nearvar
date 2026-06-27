const esbuild = require('esbuild');

const args = process.argv.slice(2);
const minify = args.includes('--minify');
const watch = args.includes('--watch');

const buildOptions = {
    entryPoints: ['src/extension.ts'],
    bundle: true,
    outfile: 'out/extension.js',
    external: ['vscode'],
    format: 'cjs',
    platform: 'node',
    sourcemap: true,
    minify,
};

if (watch) {
    esbuild.context(buildOptions).then(ctx => ctx.watch());
} else {
    esbuild.build(buildOptions).catch(() => process.exit(1));
}
