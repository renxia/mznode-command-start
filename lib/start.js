/**
 * 启动 server
 */

const readSyncByRl = require('./read-sync-stdin').readSyncByRl;
const log = require('console-log-colors').log;

const reStartNginx = require('./start-nginx');
const startNodeServer = require('./start-node-server');

function doStart(method, type) {
    let outputFolder = 'output_dev',
        msg = '...........开发环境启动 node',
        env = 'development';

    if (method === 'y' || method === 'p') {
        outputFolder = 'output';
        msg = '...........提交至测试发布环境前启动 node 测试验证';
        env = 'production';
    } else if (method === 'q') {
        outputFolder = 'output_qa';
        msg = '...........提交至开发环境前启动 node 测试验证';
        env = 'production';
    }

    process.env.NODE_ENV = env;
    msg += `(${method || env})`;
    log.green(msg);

    // type = 2 ，仅启动 node-server
    if (2 !== type) {
        // 重启 nginx
        reStartNginx();
    }

    // 启动 node-server
    return startNodeServer(outputFolder);
}


// var projectName = utils.project.getProjectName();

module.exports = function (type, method) {
    type = +type;

    if (1 === type) {
        // 重启 nginx
        return reStartNginx();
    }

    if (method && typeof method === 'string') {
        return doStart(method, type);
    }

    return readSyncByRl('启动为[output]目录 (y), [output_qa]目录 (q),[output_dev]目录 (n):').then(function(_method) {
        doStart(_method, type);
    });
}
