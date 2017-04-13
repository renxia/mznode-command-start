/**
 * 构建
 */

const utils = require('./utils');
const readSyncByRl = require('./read-sync-stdin').readSyncByRl;
const handlerPomxml = require('./handler-pomxml');
const colors = require('console-log-colors');
const log = colors.log;
const color = colors.color;
const child = require('child_process');
const path = require('path');

let fisCmd = [],
    fisParam = 'dev -wLc',
    outputName = 'output',
    method,
    project;

// 启动 node-server
function startServer(isDev) {
    var startCmd;
    var startBatPath;

    startBatPath = path.resolve(process.cwd(), 'build/start-server.bat');
    if (process.platform === 'win32' && utils.file.exists(startBatPath)) {
        startCmd = `cd build && start start-server.bat`;
    } else {
        log.red('请继续执行 npm start 以启动 node-server 以预览编译效果');
        return;
    }

    if (isDev) {
        log.red('\n已启动 start-node-server.bat，应等待 fis release 完成后再操作');
    } else {
        log.yellow('\n执行 npm start，启动 node-server 以预览编译效果');
    }

    const start = child.exec(startCmd, function (err, stdout, stderr) {
        if (stderr) {
            console.log(stderr);
        }

        if (err) {
            log(err);
        }
    });

    start.stdout.pipe(process.stdout);
}

// 启动 release
function childExec(opdir, artifactId) {
    //fis开始编译
    fisCmd.push('mznode release ', fisParam, ' -d ', opdir);
    log('fisCmd: ' + color.yellow(fisCmd.join('')));

    const proc = child.exec(fisCmd.join(''), {
        // encoding: 'utf8',
        killSignal: 'SIGTERM',
        maxBuffer: 5000 * 1024, // 默认 200 * 1024
    }, function (err, stdout, stderr) {
        if (stderr) {
            console.log(stderr);
        } else if (err) {
            log(err);
        } else {
            log.green('...........fis 编译完成');
        }

        if (method === 'y' || method === 'p') {
            // log('artifactId 为：' + artifactId, 'yellow');
            handlerPomxml.modifyPomxml({artifactId: artifactId}).then(function () {
                startServer();
            });

            //copyDir(nodeCommonPath, nodeProjectPath, copy);
        } else if (method === 'q') {
            startServer();
        }
    });

    console.log('fis release 到 ' + color.green(outputName) + ' 目录中，请耐心等候，完成后再执行: ' + color.yellow('npm start'));
    //把子进程里的输出打印到控制台
    proc.stdout.pipe(process.stdout);
}

module.exports = function () {
    const projectName = utils.project.getProjectName();
    const mznodeCfgPath = utils.resolveCfgPath();
    const mznodeCfg = utils.getMznodeCfg();
    let outputDir;

    return readSyncByRl('发布[output] (y), 联调[output_qa] (q), 开发模式[output_dev] (默认): ')
        .then((_method) => {
            method = _method;

            // 单项目结构，无需区分子模块
            if (1 === mznodeCfg.projectType) {
                return;
            }

            return readSyncByRl('Release 所有模块(default), 或部分模块(模块目录名以半角逗号","分隔): ');
        })
        .then((_project) => {
            project = _project;

            process.env.NODE_ENV = 'production';
            process.env.FIS_PROJECT = project;

            console.log('开始构建子项目：', color.red(project || '全部子项目'));
        }).then(() => {
            //1. 参数解析、环境处理
            if (method === 'p') {
                fisParam = 'prod -uc';

                log.green('...........打包并提交测试环境');
            } else if (method === 'y') {
                fisParam = 'prod -luc';

                log.green('...........加载 lint 校验插件，打包并提交测试环境');
            } else if (method === 'q') {
                fisParam = 'qa -uc';
                outputName = 'output_qa';
                process.env.NODE_ENV = 'development';

                log.yellow('...........打包并提交至开发环境，供后端联调');
            } else {
                outputName = 'output_dev';
                process.env.NODE_ENV = 'development';

                // 调试模式
                if (method === 'v') {
                    fisParam += ' --verbose';
                }

                if (method === 'l') {
                    process.env.list_mod_file = '1';
                }

                log.green('...........开发环境 fis3 release');
            }

            log.yellow('process.env.FIS_PROJECT = ' + process.env.FIS_PROJECT);
            log.yellow('process.env.NODE_ENV = ' + process.env.NODE_ENV);

            // 2. 清空构建目录
            outputDir = path.resolve(mznodeCfgPath.ROOTDIR, outputName + '/' + projectName);

            log.red('...........先清空构建目录：' + outputDir);
            utils.file.delDir(outputDir);

            // 3. 读取 pom.xml 文件
            return handlerPomxml.getVerAndArtifactId();
        }).then(function (opts) {
            // 4. 非开发环境下，读取 pom.xml 文件，设置 artifactId
            if (['y', 'p', 'q'].indexOf(method) > -1) {
                return handlerPomxml.getNewArtifactId(opts.artifactId);
            }
        }).then(function (artifactId) {
            process.env.ARTIFACTID = artifactId || '';

            // 4. 执行构建
            childExec(outputDir, artifactId || '');

            if (process.platform === 'win32' && ['y', 'p', 'q'].indexOf(method) === -1) {
                startServer(true);
            }
        });
}
