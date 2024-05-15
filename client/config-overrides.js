
// create-react-app handles basically everything in terms of build configuration
// this is just one special exception using react-app-rewired

const { override, removeModuleScopePlugin, babelInclude } = require("customize-cra");
const fs = require("fs");
const path = require("path");

module.exports = override(
    removeModuleScopePlugin(),

    babelInclude([
        path.resolve(path.join(__dirname, "src")),

        // transpile local shared module for browser
        fs.realpathSync(path.join(__dirname, "node_modules/jparty-shared"))
    ])
);