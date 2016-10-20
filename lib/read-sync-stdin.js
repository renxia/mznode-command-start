// 从命令行等待用户输入，并返回输入结果

// fs.readSync api
var fs = require('fs');
function readSyncByfs(tips) {
    var response;

    tips = tips || '> ';
    process.stdout.write(tips);
    process.stdin.pause();

    var buf = new Buffer(10000);
    response = fs.readSync(process.stdin.fd, buf, 0, 10000, 0);
    process.stdin.end();

    response = buf.toString('utf8', 0, response);

    return response.trim();
}

// readline api
var readline = require('readline');
function readSyncByRl(tips) {
    tips = tips || '> ';

    return new Promise((resolve) => {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        rl.question(tips, (answer) => {
            rl.close();
            resolve(answer.trim());
        });
    });
}

// readSyncByRl('请输入任意字符：').then((res) => {
//     console.log(res);
// });

module.exports = {
    readSyncByfs: readSyncByfs,
    readSyncByRl: readSyncByRl
}
