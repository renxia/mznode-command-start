/**
 * 启动 nginx
 */

const child = require("child_process");
const log = require('console-log-colors').log;

const utils = require('./utils');
const mzdwCfgPath = utils.resolveCfgPath();
const nginxconf = mzdwCfgPath.NGINXCONF;
const nginxDir = mzdwCfgPath.NGINXDIR;

module.exports = function () {
    return new Promise(function (rs, rj) {
        let reStartNginx;

        // process.platform: 'darwin', 'freebsd', 'linux', 'sunos' or 'win32'
        if (utils.iswin) {
            reStartNginx = `cd ${nginxDir} && tasklist|find /i "nginx.exe" && taskkill /F /IM nginx.exe > nul && start nginx || start nginx.exe -c` + nginxconf;
        } else {
            reStartNginx = `sudo nginx -s stop && nginx -c ${nginxconf}`;
        }

        // 重启 nginx
        log.yellow('\n开始重启 nginx，如出错请查看 logs 日志 ...');
        child.exec(reStartNginx, function (err, stdout, stderr) {
            if (!stderr) {
                console.log('...........nginx 启动出错，先关掉所有的 nginx 进程后再新启动 nginx，或查看 logs 目录 error.log 日志');
            }

            if (err) {
                console.log(err);
                rj(err);
            } else {
                log.green('nginx 已重启');
            }
        });

        rs();

    });
};
