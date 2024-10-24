/******/ (() => { // webpackBootstrap
/******/ 	var __webpack_modules__ = ({

/***/ 974:
/***/ ((module) => {

module.exports = eval("require")("@actions/core");


/***/ }),

/***/ 317:
/***/ ((module) => {

"use strict";
module.exports = require("child_process");

/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __nccwpck_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		var threw = true;
/******/ 		try {
/******/ 			__webpack_modules__[moduleId](module, module.exports, __nccwpck_require__);
/******/ 			threw = false;
/******/ 		} finally {
/******/ 			if(threw) delete __webpack_module_cache__[moduleId];
/******/ 		}
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/compat */
/******/ 	
/******/ 	if (typeof __nccwpck_require__ !== 'undefined') __nccwpck_require__.ab = __dirname + "/";
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};
const { execSync } = __nccwpck_require__(317);
const core = __nccwpck_require__(974);

try {
    // Get the input custom-rule-file
    const customRuleFile = core.getInput('custom-rule-file');
    const version = core.getInput('version');

    // Construct the Docker run command for Falco
    let command = 'docker run -d --name falco';

    if (customRuleFile) {
        command += ` -v ${customRuleFile}:/etc/falco/custom_rules.yaml`;
    }
    command += ` falcosecurity/falco-no-driver:${version}`;
    command += ' -r /etc/falco/falco_rules.yaml';
    command += ' -r /etc/falco/custom_rules.yaml';
    command += ' -o json_output=true';
    command += ' -o file_output.enabled=true';
    command += ' -o file_output.keep_alive=false';
    command += ' -o file_output.filename=/tmp/falco_events.json';
    command += ' -o engine.kind=modern_ebpf';

    // Execute the Docker run command
    console.log(`Running command: ${command}`);
    execSync(command, { stdio: 'inherit', shell: '/bin/bash' });
} catch (error) {
    core.setFailed(`Failed to start Falco Docker container: ${error.message}`);
}
module.exports = __webpack_exports__;
/******/ })()
;