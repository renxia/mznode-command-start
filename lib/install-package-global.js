/**
 * 安装项目依赖到全局
 */
var child = require("child_process");
var program = require('commander');
var fs = require('fs');
var path = require('path');

program
    .version('0.0.1')
    .option('-f, --filename [type]', '依赖包配置文件的路径', 'package.json')
    .option('-h, --help [type]', 'useage: npm install-package.j --filename <filename>', 'help')
    .parse(process.argv);

/**
 * 如果为 package.json 并且包含 devDependencies 字段配置，格式化为安装的数组格式
 * @param  {Object} json  peerDependencies/devDependencies 配置
 * @return {Array}
 */
function formatDependencies(json) {
    var arrayList = [], version;

    for(var item in json) {
        version = (json[item] + '').replace(/^(\^|\*|\~|@|>|<)/, '');
        version = version ? ('@' + version) : '';
        arrayList.push(item + version);
    }

    return arrayList;
}

/**
 * 加载配置文件
 * @param  {String} filename package.json
 */
function requireFileConfig(filename) {
    var filePath = path.resolve(__dirname, filename);
    //console.log(filePath);
    if (fs.existsSync(filePath)) {
        return require(filePath);
    }

    return false;
}

function help() {
    console.log('useage: node install-package-global.js --filename <filename>');
}

function installPackage(arr) {
    var len = arr.length, i, proc;
    console.log('\n├──一共有' + len + '个插件，请耐心等待，中途不要退出');
    for (i = 0; i < len; i++) {
        console.info('├──开始安装：' + arr[i]);
        proc = child.execSync('npm install -g ' + arr[i] + ' --registry=http://registry.npm.taobao.org/ --disturl=https://npm.taobao.org/dist', {
            maxBuffer: 1024 * 1024 * 3,
            encoding: 'utf8'
        });
        console.log(proc);
    }
}

/**
 * 执行
 */
function run() {
    var config;
    var arr = [];
    if (program.filename) {
        config = requireFileConfig(program.filename);
    }

    if (
        program.rawArgs.indexOf('--help') !== -1 ||
        program.rawArgs.indexOf('-h') !== -1 ||
        ! program.filename
    ) {
        return help();
    }

    if (! config) {
        return console.log('文件不存在:', path.resolve(process.cwd(), program.filename));
    }

    if (config.globalDependencies) {
        arr = formatDependencies(config.globalDependencies);
    } else if (config.peerDependencies) {
        arr = formatDependencies(config.peerDependencies);
    } else if (config.devDependencies) {
        arr = formatDependencies(config.devDependencies);
    } else if (Array.isArray(config)) {
        arr = config;
    }
    installPackage(arr);
}

module.exports = run;
