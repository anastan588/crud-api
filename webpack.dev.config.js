const path = require('path');

module.exports = {
    mode: 'development',
    devtool: 'inline-source-map',
    devServer: {
        watchFiles: path.join(__dirname, 'src'),
    },
};