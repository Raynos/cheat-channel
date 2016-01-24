'use strict';

/* @flow */

/* Semantics:

    Takes frames in; Mutates the id; forwards.

    Accepting one TCP socket in; Hardcoded to send to a relays

    This program is bounded by a single TCP socket

    node naive-relay.js [port] [host] [hps]
*/

var assert = require('assert');
var process = global.process;
var console = require('console');
var setTimeout = require('timers').setTimeout;

var Channel = require('../channel.js');
var RelayHandler = require('../relay-handler.js');

if (require.main === module) {
    var args = process.argv.slice(2);
    process.title = 'nodejs-benchmarks-naive_relay';
    main(args);
}

function main(argv) {
    assert(argv[0], '--port required');
    assert(argv[1], '--host required');
    assert(argv[2], '--relays required');

    var port = argv[0];
    var host = argv[1];
    var relays = argv[2].split(',');
    var printRPSEnabled = (argv[3] === '1');

    var channel = new Channel();
    channel.listen(port, host);

    var handler = new RelayHandler(channel, relays);
    channel.handler = handler;

    if (printRPSEnabled) {
        setTimeout(printRPS, 1000);
    }

    function printRPS() {
        var rate = handler.responseCount;
        /*:: (handler.responseCount : number) */
        handler.responseCount = 0;

        /*eslint no-console: 0*/
        console.log('RPS[node_relay]:', rate);

        setTimeout(printRPS, 1000);
    }
}
