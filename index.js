/**
 * 启动 node-server
 */

exports.name = 'start <options>';
exports.desc = 'mznode start command.';
exports.options = {
    '--server': 'start nginx and node-server.',
    '--nginx': 'start nginx.',
    '--node': 'start node-server.',
    '--build': 'start build.'
};

exports.run = function (argv, cli) {
    // 如果输入为 fis3 foo -h
    // 或者 fis3 foo --help
    // 则输出帮助信息。
if (argv.h || argv.help) {
        return cli.help(exports.name, exports.options);
    }

    if (argv.server) {
        // 启动 nginx 和 node-server
        require('./lib/start')();
    } else if (argv.nginx) {
        // 启动 nginx
        require('./lib/start')(1);
    } else if (argv.node) {
        // 启动 node-server
        require('./lib/start')(2);
    } else if(argv.build) {
        // 启动项目构建
        require('./lib/build')();
    } else {
        cli.help(exports.name, exports.options);
    }
}
