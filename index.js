'use strict'
let EDGE = require('./lib/edge')
let edge

exports.start = function (options) {
    console.log("Starting edge router on commPort",options.commPort);
    edge = new EDGE(options)
}

exports.simulateData = function(bufdata){
    console.log('simulating data', bufdata.toString())
    edge.process232Data(bufdata)
}
