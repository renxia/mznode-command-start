/**
 * 处理 pom.xml 文件
 */
const fs = require('fs');
const path = require('path');
const utils = require('./utils');
const colors = require('console-log-colors');
const color = colors.color;
const readSyncByRl = require('./read-sync-stdin').readSyncByRl;
const projectName = utils.project.getProjectName();
const mznodeCfg = utils.getMznodeCfg();

// 取得新的 artifactId
function getNewArtifactId(artifactId) {
    return new Promise(function (resolve, reject) {
        let tip = [color('artifactId', 'yellow'),
            ` 决定了线上部署规范的目录结构： /data/node/node-server/${color('<artifactId>', 'red')}\n`,
            `当前 ${color('pom.xml', 'yellow')} 中 `,
            color('project.artifactId', 'yellow'),
            ' 为 [',
            color(artifactId, 'yellow'),
            ']\n\n',
            color('设置 artifactId:', 'green'),
            `\n ${projectName + color('[1]', 'green')}(默认), `];

        let projects = process.env.FIS_PROJECT;

        if (!projects || projects === 'undefined') {
            // 多项目模式，全部 release 则使用项目名
            resolve(projectName);
            return;
        }

        if (+mznodeCfg.projectType === 2 && projects && -1 === projects.indexOf(',')) {
            tip.push(projects + color('[2]', 'green') + ',');
        }

        if (artifactId !== projects) {
            tip.push(artifactId + color('[3]', 'green') + ',');
        }

        tip.push('请选择确认或手动输入: ');

        colors.log('============================================', 'yellow');

        return readSyncByRl(tip.join(''))
        .then((type) => {
            type = ('' + type).trim();

            if ('1' === type || !type) {
                resolve(projectName);
            } else if ('2' === type) {
                resolve(projects);
            } else if ('3' === type) {
                resolve(artifactId);
            } else {
                resolve(type);
            }
        });
    });
}

// 取得新的版本号
function getNewVersion(ver) {
    let newVersion;
    let rc = Number(ver.slice(-2)) + 1;

    if (rc < 10) {
        rc = '0' + rc;
    }

    newVersion = ver.slice(0, -2) + rc;

    let tip = [
        '当前 ',
        color('pom.xml', 'yellow'),
        ' 中版本为 [',
        color(ver, 'green'),
        ']\r\n 自动加 1，改为 ',
        color(newVersion, 'yellow'),
        color(' [1]', 'green'),
        '(默认), 不变 ',
        color('[2]', 'green'),
        ', 或手动输入(注意格式): '
    ];

    colors.log('============================================', 'yellow');

    return readSyncByRl(tip.join(''))
        .then((type) => {
            type = ('' + type).trim();

            if (/(\d+\.){2}\d+-RC\d+/.test(type)) {
                newVersion = type;
            } else if ('2' === type) {
                newVersion = ver;
            }

            return newVersion;
        });
}

const cfgPath = utils.resolveCfgPath();
const pomXmlPath = path.resolve(process.cwd(), cfgPath.POMXML);
const rootPath = path.resolve(process.cwd(), cfgPath.ROOTDIR);

// 从 pom.xml 中读取 version 和 artifactId
function getVerAndArtifactId() {
    return new Promise(function (resolve, reject) {
        fs.readFile(pomXmlPath, 'utf8', function (err, pomxmlStr) {
            if (err) {
                throw err;
            }

            const list = pomxmlStr.split(/com.meizu.node/im);

            let startPos = list[1].indexOf('<artifactId>') + '<artifactId>'.length;
            let endPos = list[1].indexOf('</artifactId>');
            let artifactId = list[1].slice(startPos, endPos);

            startPos = list[1].indexOf('<version>') + '<version>'.length;
            endPos = list[1].indexOf('</version>');

            let version = list[1].slice(startPos, endPos);

            resolve({
                version: version,
                artifactId: artifactId,
                list: list
            })
        })
    });
}

// 在构建提测代码时，执行 pomxml 文件处理
function modifyPomxml(opts = {}, callback) {
    let version, list, artifactId;

    return getVerAndArtifactId().then(function (result) {
        list = result.list;
        version = result.version;
        artifactId = result.artifactId;

        // 已经设置了 artifactId，就不需要再次设置
        if (opts.artifactId) {
            if (artifactId !== opts.artifactId) {
                list[1] = list[1].replace(artifactId, opts.artifactId);
            }

            process.env.ARTIFACTID = artifactId.trim();

            return getNewVersion(version.trim());
        }

        // 修改 artifactId
        return getNewArtifactId(artifactId.trim()).then(function (newArtifactId) {
            if (artifactId !== newArtifactId) {
                list[1] = list[1].replace(artifactId, newArtifactId);
            }

            process.env.ARTIFACTID = artifactId.trim();

            return getNewVersion(version.trim());
        })
    }).then(function (newVersion) {
        let newPomContent;

        if (version !== newVersion) {
            list[1] = list[1].replace(version, newVersion);
        }

        newPomContent = list.join('com.meizu.node');

        if ('function' === typeof callback) {
            callback(newPomContent);
        }

        // 写回到 pom.xml

        colors.log("...更新 pom.xml 文件", 'green');

        return new Promise(function (rs, rj) {
            fs.writeFile(pomXmlPath, newPomContent, function (e) {
                if (e) {
                    throw e;
                }

                colors.log("...复制 pom.xml 到根目录", 'green');
                utils.file.copyFile(pomXmlPath, path.resolve(rootPath, './pom.xml'));
                colors.log('============================================', 'yellow');

                rs();
            });
        });
    });
}

module.exports = {
    modifyPomxml,
    getNewVersion,
    getNewArtifactId,
    getVerAndArtifactId
};
