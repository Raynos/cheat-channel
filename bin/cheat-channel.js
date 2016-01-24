'use strict';

/* @flow */

/*eslint no-console: 0*/

var process = global.process;
var console = require('console');
var parseArgs = require('minimist');
var assert = require('assert');

var BenchServer = require('./bench_server.js');

function startServer(opts) {
    var benchServer = new BenchServer(opts.port);
    benchServer.listen();

    console.log('listening on:', opts.port);
}

function printShortHelp() {
    console.log('cheat-channel [server|client] [--port=num]');
}

function printHelp() {
    console.log('cheat-channel [mode]');
    console.log('');
    console.log('    [mode] - either `server` or `client`');
    console.log('    --port - the port to bind on');
}

function main(opts) {
    var type = opts._[0];

    if (opts.h || !type) {
        printShortHelp();
    } else if (opts.help) {
        printHelp();
    } else if (type === 'server') {
        assert(opts.port, '--port required');
        startServer(opts);
    } else {
        printShortHelp();
    }
}

if (require.main === module) {
    main(parseArgs(process.argv.slice(2)));
}
