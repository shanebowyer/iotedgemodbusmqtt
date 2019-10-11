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

let tools = {
    connectMqtt(args){
        let deferred = Q.defer()
        let self = this
        try{
            let mqtt = MQTT.connect(config.mqttServer)
            mqtt.on('connect', function () {
                mqtt.subscribe(config.mqttSubscribe, function (err) {
                    if (err) {
                        deferred.reject(err)
                    }else{
                        args.mqtt = mqtt
                        mqtt.subscribe(config.mqttControlSubscribe, function (err) {
                            if (err) {
                                deferred.reject(err)
                            }else{
                                deferred.resolve(args)
                            }
                        })
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


describe.only('test edgeRouter', function(){
    it.only('start test', function(){
        edgeRouter.start('/dev/ttyUSB0', 19200, commands, config.mqttServer, config.mqttSubscribe, config.mqttControlSubscribe)
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
                    response.mqtt.removeAllListeners('message')
                    deferred.resolve({topic,message})
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
            expect(data.AI1).to.equal(259);
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
                    if(typeof data.control == 'undefined'){
                        clearTimeout(tOut)
                        response.mqtt.removeAllListeners('message')
                        deferred.resolve({topic,message})
                    }
                })
            }catch(e){
                deferred.reject(e)
            }


            let bufdata = Buffer.alloc(11)
            bufdata[0] = 1                  //rtuid
            bufdata[1] = 16                 //function code
            bufdata[2] = (6 / 256) & 256    //Start Register
            bufdata[3] = 6 & 256            //Start Register
            bufdata[4] = (1 / 256) & 256    //Number Of Register
            bufdata[5] = 1 & 256            //Number Of Register
            bufdata[6] = 2                  //Byte Count
            bufdata[7] = (200 >> 8) & 255   //Value
            bufdata[8] = 200 & 255          //Value

            let crc = tools.calculateCRC(bufdata)
            bufdata[9]  = crc & 255          //crc
            bufdata[10] = (crc >> 8) & 255   //crc

            response.mqtt.publish(config.mqttControlSubscribe, JSON.stringify({ "control": bufdata }))
            return deferred.promise
        }

        let response = {}
        try{
            response = await sendData(response)
            let data = JSON.parse(response.message.toString())
            expect(data.AI1).to.equal(200);
        }catch(e){
            throw e
        }
    })

    it('simulate write/control success', async function(){
        async function sendData(args){
            let deferred = Q.defer()

            let response = args
            try{
                response = await tools.connectMqtt(response)
                response.mqtt.on('message', function (topic, message) {
                    response.mqtt.removeAllListeners('message')
                    deferred.resolve({topic,message})
                })
            }catch(e){
                deferred.reject(e)
            }


            let bufdata = Buffer.alloc(6)
            bufdata[0] = 1      //rtuid
            bufdata[1] = 16     //function code
            edgeRouter.simulateData(bufdata)    
            return deferred.promise
        }

        let response = {}
        try{
            response = await sendData(response)
            let data = JSON.parse(response.message.toString())
            expect(data.result).to.equal('success');
        }catch(e){
            throw e
        }        
    })


})