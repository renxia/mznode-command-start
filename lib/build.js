/**
 * 构建
 */

const child = require('child_process');
const path = require('path');
const mznodeUtil = fis.mznodeUtil;
const mznodeCfgPath = mznodeUtil.resolveCfgPath();
const mznodeCfg = mznodeUtil.getMznodeCfg();
const readSyncByRl = require('./read-sync-stdin').readSyncByRl;
const handlerPomxml = require('./handler-pomxml');
const colors = require('console-log-colors');
const log = colors.log;
const color = colors.color;

let fisCmd = [],
    fisParam = 'dev -wLc',
    outputName = 'output',
    method,
    project;

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
                mznodeUtil.startServerBat(false, method);
            });

            //copyDir(nodeCommonPath, nodeProjectPath, copy);
        } else if (method === 'q') {
            mznodeUtil.startServerBat(false, method);
        }
    });

    console.log('fis release 到 ' + color.green(outputName) + ' 目录中，请耐心等候，完成后再执行: ' + color.yellow('npm start'));
    //把子进程里的输出打印到控制台
    proc.stdout.pipe(process.stdout);

    // 开发模式下需手动启动 start-server.bat 等待编译完成的情况
    if (mznodeUtil.isWin && process.env.NODE_ENV ==='development' && !mznodeCfg.autoStartServer) {
        mznodeUtil.startServerBat(true);
    }
}

module.exports = function () {
    const projectName = mznodeUtil.project.getProjectName();
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
            project = _project || '';
            process.env.FIS_PROJECT = project;

            console.log('开始构建子项目：', color.red(project || '全部子项目'));
        }).then(() => {
            let msg = '';
            let nodeEnv = 'development';

            //1. 参数解析、环境处理
            if (method === 'p') {
                fisParam = 'prod -uc';
                nodeEnv = 'production';

                msg = '...........打包并提交测试环境';
            } else if (method === 'y') {
                fisParam = 'prod -luc';
                nodeEnv = 'production';

                msg = '...........加载 lint 校验插件，打包并提交测试环境';
            } else if (method === 'q') {
                fisParam = 'qa -uc';
                outputName = 'output_qa';

                msg = '...........打包并提交至开发环境，供后端联调';
            } else {
                outputName = 'output_dev';

                // 调试模式
                if (method === 'v') {
                    fisParam += ' --verbose';
                }

                if (method === 'l') {
                    process.env.list_mod_file = '1';
                }

                msg = '...........开发环境 fis3 release';
            }

            process.env.NODE_ENV = nodeEnv;
            log.green(msg);
            log.yellow('process.env.FIS_PROJECT = ' + process.env.FIS_PROJECT);
            log.yellow('process.env.NODE_ENV = ' + process.env.NODE_ENV);

            // 2. 清空构建目录
            outputDir = path.resolve(mznodeCfgPath.ROOTDIR, outputName + '/' + projectName);

            log.red('...........先清空构建目录：' + outputDir);

            try {
                mznodeUtil.file.delDir(outputDir);
            } catch(err) {
                console.log('delDir err', err);
                fis.util.del(outputDir);
            }

            // 3. 读取 pom.xml 文件
            return handlerPomxml.getVerAndArtifactId();
        }).then(function (opts) {
            // 4. 非开发环境下，读取 pom.xml 文件，设置 artifactId
            if (['y', 'p', 'q'].indexOf(method) > -1) {
                return handlerPomxml.getNewArtifactId(opts.artifactId);
            }
        }).then(function (artifactId) {
            process.env.ARTIFACTID = artifactId || '';

            // 5. 执行构建
            childExec(outputDir, artifactId || '');
        });
}
