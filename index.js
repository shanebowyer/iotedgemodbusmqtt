'use strict'

let EDGE = require('./lib/edge')

let edge

exports.start = function (commPort, baud, commands) {
    console.log("Starting edge router on commPort",commPort);
    edge = new EDGE(commPort,baud,commands)
}

exports.simulateData = function(bufdata){
    console.log('simulating data', bufdata.toString())
    edge.process232Data(bufdata)
}