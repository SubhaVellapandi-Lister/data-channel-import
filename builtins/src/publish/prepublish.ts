if (!process.env.PUBLIB) {
    console.log('Run `npm run publish:lib` rather than npm publish');
    process.exit(1);
}
