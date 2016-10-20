/**
 * 启动 node-server
 */

const child = require("child_process");
const log = require('console-log-colors').log;
const utils = require('./utils');

module.exports = function (outputFolder) {
    let startCMD;
    const projectName = utils.project.getProjectName();
    const startJsPath = utils.project.getNodeServerStartJs(outputFolder, projectName);

    log.yellow('启动 node-server：' + startJsPath);
    log.yellow('process.env.NODE_ENV = ' + process.env.NODE_ENV);

    // process.platform: 'darwin', 'freebsd', 'linux', 'sunos' or 'win32'
    if (process.platform !== 'win32') {
        startCMD = `pm2 kill && pm2 start ${startJsPath} -i 4 --name orion --no-daemon`;
    } else {
        startCMD = `supervisor ${startJsPath}`;
    }

    // 启动 node-server
    log.yellow('开始启动 node-server ...');
    const proc = child.exec(startCMD, (err, stdout, stderr) => {
        if (stderr) {
            console.log(stderr);
        }

        if (err) {
            console.log(err);
        }
    });

    return proc.stdout.pipe(process.stdout);
}
