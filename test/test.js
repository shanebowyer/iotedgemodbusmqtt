'use strict'

var config      = require('./config.json')
var chai        = require('chai');
var chaiSubset  = require('chai-subset');
chai.use(chaiSubset);
var expect      = require('chai').expect;

var Q           = require('q');
let MQTT        = require('mqtt');


let edgeRouter = require('../index')

let commands = [
    {
        index: 0,
        RTUAddress: 1,
        functionCode: 3,
        register: 4354,
        output: [],
        input: "AI1",
        cofsSP: 1,
        cofsValue: null
    },
    {
        index: 1,
        RTUAddress: 1,
        functionCode: 3,
        register: 4355,
        output: [],
        input: "AI3",
        cofsSP: 3,
        cofsValue: null
    }
]

let txStructure = {
    txType: null,
    data: null
}

let tools = {
    connectMqtt(args){
        let deferred = Q.defer()
        let self = this
        try{
            let mqtt = MQTT.connect(config.mqttServer,{ host: config.mqttServer, port: config.mqttPort, username: config.mqttUserName, password: config.mqttPassword })
            mqtt.on('connect', function () {
                mqtt.subscribe(config.mqttSubscribe, function (err) {
                    if (err) {
                        deferred.reject(err)
                    }else{
                        args.mqtt = mqtt
                        deferred.resolve(args)
                    }
                })
            })
        }catch(e){
            deferred.reject(e)
        }
        return deferred.promise
    },
    calculateCRC: function(byteData){
        var x;
        var crc;
        var y;
        var tmp;
        crc = 65535;
        for (x = 0; x < byteData.length - 2; x++)
        {
            crc ^= byteData[x];
            for (y = 0; y < 8; y++)
            {
                tmp = (crc & 1);
                crc >>= 1;
                if (tmp != 0)
                {
                    crc ^= 40961;
                }
            }
        }
        return crc;
    }      
}

describe('test edgeRouter', function(){
    it('start test', function(){
        edgeRouter.start({
            rtuId: config.rtuId,
            commPort: '/dev/ttyUSB0',
            baud: 19200 , 
            commands: commands, 
            mqttServer: config.mqttServer,
            mqttPort: config.mqttPort,
            mqttUserName: config.mqttUserName,
            mqttPassword: config.mqttPassword,
            mqttSubscribe: config.mqttSubscribe, 
            txTimeSP: 2,
            enable232: 'false'
        })
    })
    it('simulate data 257 for index 0', function(){
        let bufdata = Buffer.alloc(6)
        bufdata[0] = 1      //rtuid
        bufdata[1] = 3      //function code
        bufdata[2] = 1      //number of registers
        bufdata[3] = 1      //data
        bufdata[4] = 1      //data
        bufdata[5] = 255    //crc
        bufdata[6] = 255    //crc
        edgeRouter.simulateData(bufdata)
    })

    it('simulate data 258 for index 1', function(){
        let bufdata = Buffer.alloc(6)
        bufdata[0] = 1      //rtuid
        bufdata[1] = 3      //function code
        bufdata[2] = 1      //number of registers
        bufdata[3] = 1      //data
        bufdata[4] = 2      //data
        bufdata[5] = 255    //crc
        bufdata[6] = 255    //crc
        edgeRouter.simulateData(bufdata)
    })

    it('simulate cofs data 259 for index 0 and receive mqtt message from edge router', async function(){

        async function sendData(args){
            let deferred = Q.defer()

            let response = args
            try{
                response = await tools.connectMqtt(response)
                response.mqtt.on('message', function (topic, message) {
                    let data = JSON.parse(message.toString())
                    if(data.source == 'server'){
                        response.mqtt.removeAllListeners('message')
                        deferred.resolve({topic,message})
                    }
                })
            }catch(e){
                deferred.reject(e)
            }


            let bufdata = Buffer.alloc(6)
            bufdata[0] = 1      //rtuid
            bufdata[1] = 3      //function code
            bufdata[2] = 1      //number of registers
            bufdata[3] = 1      //data
            bufdata[4] = 3      //data
            bufdata[5] = 255    //crc
            bufdata[6] = 255    //crc
            edgeRouter.simulateData(bufdata)
    
            return deferred.promise
        }

        let response = {}
        try{
            response = await sendData(response)
            let data = JSON.parse(response.message.toString())
            expect(data.data.AI1).to.equal(259);
        }catch(e){
            throw e
        }
    })

    it('send modbus write/control via mqtt', async function(){

        async function sendData(args){
            let deferred = Q.defer()

            let tOut = setTimeout(function(){
                deferred.reject('Timeout to wrtie/control command')
            },2000)

            let response = args
            try{
                response = await tools.connectMqtt(response)
                response.mqtt.on('message', function (topic, message) {
                    let data = JSON.parse(message.toString())
                    if(data.txType == 'controlSuccess' && data.source == 'server'){
                        expect(data.txType).to.equal('controlSuccess');
                    }
                    if(data.txType == 'controlCarriedOut' && data.source == 'server'){
                        clearTimeout(tOut)
                        response.mqtt.removeAllListeners('message')
                        expect(data.txType).to.equal('controlCarriedOut');
                        deferred.resolve({topic,message})
                    }
                })
            }catch(e){
                deferred.reject(e)
            }

            let output = txStructure
            output.txType = 'control',
            output.data = { "rtuId": 1, "modbusRegister": 6, "value": 400 }
            response.mqtt.publish(config.mqttSubscribe, JSON.stringify(output))
            return deferred.promise
        }

        let response = {}
        try{
            response = await sendData(response)
            let data = JSON.parse(response.message.toString())
            expect(data.data.AI1).to.equal(400);
        }catch(e){
            throw e
        }
    })

    it('updateCommands via mqtt', async function(){

        async function sendData(args){
            let deferred = Q.defer()

            let tOut = setTimeout(function(){
                deferred.reject('Timeout to updateCommands via mqtt')
            },2000)

            let response = args
            try{
                response = await tools.connectMqtt(response)
                response.mqtt.on('message', function (topic, message) {
                    let data = JSON.parse(message.toString())
                    if(data.txType == 'updateCommandsSuccess' && data.source == 'server'){
                        clearTimeout(tOut)
                        response.mqtt.removeAllListeners('message')
                        deferred.resolve({topic,message})
                    }
                })
            }catch(e){
                deferred.reject(e)
            }

            let output = txStructure
            output.txType = 'updateCommands',
            output.data = [
                {
                    index: 0,
                    RTUAddress: 1,
                    functionCode: 3,
                    register: 4354,
                    output: [],
                    input: "AI2",
                    cofsSP: 1,
                    cofsValue: null
                },
                {
                    index: 1,
                    RTUAddress: 1,
                    functionCode: 3,
                    register: 4355,
                    output: [],
                    input: "CI1",
                    cofsSP: 3,
                    cofsValue: null
                }
            ]
            
            response.mqtt.publish(config.mqttSubscribe, JSON.stringify(output))
            return deferred.promise
        }

        let response = {}
        try{
            response = await sendData(response)
            let data = JSON.parse(response.message.toString())
            expect(data.txType).to.equal('updateCommandsSuccess');
        }catch(e){
            throw e
        }
    })    

    it('get status via mqtt', async function(){

        async function sendData(args){
            let deferred = Q.defer()

            let tOut = setTimeout(function(){
                deferred.reject('Timeout to get status via mqtt')
            },2000)

            let response = args
            try{
                response = await tools.connectMqtt(response)
                response.mqtt.on('message', function (topic, message) {
                    let data = JSON.parse(message.toString())
                    if(data.txType == 'statusSuccess' && data.source == 'server'){
                        clearTimeout(tOut)
                        response.mqtt.removeAllListeners('message')
                        deferred.resolve({topic,message})
                    }
                })
            }catch(e){
                deferred.reject(e)
            }

            let output = txStructure
            output.txType = 'status',
            output.data = null
            
            response.mqtt.publish(config.mqttSubscribe, JSON.stringify(output))
            return deferred.promise
        }

        let response = {}
        try{
            response = await sendData(response)
            let data = JSON.parse(response.message.toString())
            expect(data.txType).to.equal('statusSuccess');
            expect(data.data.AI1).to.equal(400);
        }catch(e){
            throw e
        }
    })     

    it('get commands status via mqtt', async function(){

        async function sendData(args){
            let deferred = Q.defer()

            let tOut = setTimeout(function(){
                deferred.reject('Timeout to get  commands status via mqtt')
            },2000)

            let response = args
            try{
                response = await tools.connectMqtt(response)
                response.mqtt.on('message', function (topic, message) {
                    let data = JSON.parse(message.toString())
                    if(data.txType == 'statusCommandsSuccess' && data.source == 'server'){
                        clearTimeout(tOut)
                        response.mqtt.removeAllListeners('message')
                        deferred.resolve({topic,message})
                    }
                })
            }catch(e){
                deferred.reject(e)
            }

            let output = txStructure
            output.txType = 'statusCommands',
            output.data = null
            
            response.mqtt.publish(config.mqttSubscribe, JSON.stringify(output))
            return deferred.promise
        }

        let response = {}
        try{
            response = await sendData(response)
            let data = JSON.parse(response.message.toString())
            expect(data.txType).to.equal('statusCommandsSuccess');
            expect(data.data[0].input).to.equal('AI2');
        }catch(e){
            throw e
        }
    })      
})