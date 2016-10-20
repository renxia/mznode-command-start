/**
 * 启动 server
 */

const readSyncByRl = require('./read-sync-stdin').readSyncByRl;
const log = require('console-log-colors').log;
// const utils = require('./utils');

const reStartNginx = require('./start-nginx');
const startNodeServer = require('./start-node-server');

// var projectName = utils.project.getProjectName();

module.exports = function (type) {
    let outputFolder = 'output_dev';

    type = +type;

    if (1 === type) {
        // 重启 nginx
        return reStartNginx();
    }

    return readSyncByRl('启动为[output]目录 (y), [output_qa]目录 (q),[output_dev]目录 (n):').then((method) => {
        if (method === 'y') {
            outputFolder = 'output';
            process.env.NODE_ENV = 'production';
            log.green('...........提交至测试发布环境前启动 node 测试验证');
        } else if (method === 'q') {
            outputFolder = 'output_qa';
            process.env.NODE_ENV = 'development';
            log.green('...........提交至开发环境前启动 node 测试验证');
        } else {
            process.env.NODE_ENV = 'development';
            log.green('...........开发环境启动 node');
        }

        // type = 2 ，仅启动 node-server
        if (2 !== type) {
            // 重启 nginx
            reStartNginx();
        }

        // 启动 node-server
        return startNodeServer(outputFolder);
    });
}
