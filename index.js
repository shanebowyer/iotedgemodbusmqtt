'use strict'

let EDGE = require('./lib/edge')

let edge

exports.start = function (commPort, baud, commands, mqttServer, mqttSubscribe, mqttControlSubscribe) {
    console.log("Starting edge router on commPort",commPort);
    edge = new EDGE(commPort,baud,commands, mqttServer, mqttSubscribe, mqttControlSubscribe)
}

exports.simulateData = function(bufdata){
    console.log('simulating data', bufdata.toString())
    edge.process232Data(bufdata)
}