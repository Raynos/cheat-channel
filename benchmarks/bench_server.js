'use strict';

/* @flow */

var process = global.process;
process.title = 'nodejs-benchmarks-cheat_bench_server';

var parseArgs = require('minimist');
var assert = require('assert');

var Channel = require('../channel.js');

var SERVER_HOST = '127.0.0.1';

/*::
import * as type from './bench_server.h.js';
declare var BenchServer : Class<type.BenchServer>
declare var BenchService : Class<type.BenchService>
*/

function BenchServer(port) {
    var self/*:BenchServer*/ = this;
    self.port = port;

    // TODO: stats
    // TODO: trace propagation
    // TODO: timeouts
    self.channel = new Channel();
    self.benchService = new BenchService();

    // TODO: optional trace reporter
    self.registerEndpoints();
}

BenchServer.prototype.registerEndpoints =
function registerEndpoints() {
    var self/*:BenchServer*/ = this;

    self.channel.endpoints.registerRawService(
        'benchmark', self.benchService, ['ping', 'set', 'get']
    );
};

BenchServer.prototype.listen =
function listen() {
    var self/*:BenchServer*/ = this;

    self.channel.listen(self.port, SERVER_HOST);
};

function BenchService() {
    var self/*:BenchService*/ = this;

    self.keys = {};
}

BenchService.prototype.handleGet =
function handleGet(frame, res) {
    var self/*:BenchService*/ = this;
    var key = frame.readArg2str();

    if (self.keys[key] !== undefined) {
        var val = self.keys[key];
        res.sendOk(val.length.toString(10), val);
    } else {
        res.sendNotOk('key not found', key);
    }
};

BenchService.prototype.handleSet =
function handleSet(frame, res) {
    var self/*:BenchService*/ = this;

    var key = frame.readArg2str();
    var val = frame.readArg3();

    self.keys[key] = val;

    res.sendOk('ok', 'really ok');
};

BenchService.prototype.handlePing =
function handlePing(frame, res) {
    res.sendOk('pong', null);
};

function main(opts) {
    assert(opts.port, 'port needed');
    assert(opts.instances, 'instances needed');

    var INSTANCES = parseInt(opts.instances, 10);
    var basePort = parseInt(opts.port, 10);
    for (var i = 0; i < INSTANCES; i++) {
        var port = basePort + i;

        var benchServer = new BenchServer(port);
        benchServer.listen();
    }
}

if (require.main === module) {
    main(parseArgs(process.argv.slice(2)));
}
