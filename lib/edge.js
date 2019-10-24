'use strict'

var Q = require('q');
let MQTT = require('mqtt');
var SerialPort = require("serialport")


class edge {
    constructor(options) {
        //commPort, baud, commands, mqttServer, mqttSubscribe, txTimeSP
        console.log('running...')
        this.rtuId = options.rtuId || 0

        this.txTimeSP = options.txTimeSP || 2
        this.txTime = this.txTimeSP
        this.mqtt = null
        this.mqttServer = options.mqttServer || 'localhost'
        this.mqttPort = options.mqttPort || 1883
        this.mqttUserName = options.mqttUserName || ''
        this.mqttPassword = options.mqttPassword || ''
        this.mqttSubscribe = options.mqttSubscribe || 'telemetry1501'
        this.commPort = options.commPort || '/dev/ttyUSB0'
        this.baud = options.baud || 19200
        this.enable232 = options.enable232 || 'true'
        this.index = 0
        this.serialPort = null

        this.txStructure = {
            source: 'server',
            rtuId: this.rtuId,
            txType: null,
            data: null
        }

        this.status = {
            time: null,
            date: null,
            TxFlag: 0,
            digitalsIn: 0,
            AI1: 0,
            AI2: 0,
            AI3: 0,
            AI4: 0,
            AIExt1: 0,
            AIExt2: 0,
            AIExt3: 0,
            AIExt4: 0,
            AIExt5: 0,
            AIExt6: 0,
            AIExt7: 0,
            AIExt8: 0,
            CI1: 0,
            CI2: 0,
            CI3: 0,
            CI4: 0,
            CI5: 0,
            CI6: 0,
            CI7: 0,
            CI8: 0,
            BATT: 0,
            SIG: 0
        }

        this.commands = options.commands || []
        this.init()
    }

    async init() {
        let response = {}
        let self = this
        try {
            if(this.rtuId == 0){
                throw 'Invalid rtuId'
            }else{
                response = await this.compileOutputs(response)
                response = await this.connectMqtt(response)
                if(this.enable232 == 'true'){
                    response = await this.handleCommPort(response)
                }
                self.start(2000)
                self.fixedTx()
            }            
        } catch (e) {
            console.log('init Error', e)
        }
    }

    fixedTx() {
        let self = this
        this.tmrTx = setInterval(function () {
            self.txTime--
            if (self.txTime < 0) {
                self.txTime = self.txTimeSP
                self.sendDataViaMqtt('fixedTx')
            }
        },60000)
    }

    connectMqtt(args) {
        let deferred = Q.defer()
        let self = this
        try {
            self.mqtt = MQTT.connect(self.mqttServer, { host: self.mqttServer, port: self.mqttPort, username: self.mqttUserName, password: self.mqttPassword })
            self.mqtt.on('connect', function () {
                self.mqtt.subscribe(self.mqttSubscribe, function (err) {
                    if (err) {
                        deferred.reject(err)
                    } else {
                        console.log('mqtt subscribed to', self.mqttSubscribe)
                        self.mqtt.on('message', function (topic, message) {
                            console.log('mqtt message received', { topic: topic, message: message })
                            self.processMqttData({ topic: topic, message: message })
                        })
                        deferred.resolve(args)
                    }
                })
            })
        } catch (e) {
            deferred.reject(e)
        }
        return deferred.promise
    }

    start(interval) {
        this.loop = setInterval(() => {
            // console.log('sending modbus data', this.commands[this.index].output.join(' ') + '\r\n')
            if (this.writeCommand) {
                let command = this.writeCommand.join(' ') + '\r\n'
                console.log('modbus write>>>>>>>>>>>>>>>>>', command)
                this.serialPort.write(this.writeCommand)
                this.writeCommand = null
            } else {
                let command = this.commands[this.index].output.join(' ') + '\r\n'
                console.log('modbus read', command)
                this.serialPort.write(this.commands[this.index].output)
            }
        }, interval || 2000)
    }

    async processMqttData(data) {
        let message = JSON.parse(data.message)
        let self = this

        if (typeof message.txType != 'undefined') {
            if (typeof message.data != 'undefined' && message.source != 'server') {
                console.log('processMqttData', message.txType)
                switch (message.txType) {
                    case ('control'):
                        self.compileWrite(message.data)
                        self.txStructure.txType = 'controlSuccess'
                        self.txStructure.data = message.data
                        self.mqtt.publish(self.mqttSubscribe, JSON.stringify(self.txStructure))
                        break
                    case ('updateCommands'):
                        self.commands = message.data
                        self.index = 0
                        let response = {}
                        try{
                            response = await self.compileOutputs(response)
                            self.txStructure.txType = 'updateCommandsSuccess'
                            self.txStructure.data = self.commands
                            self.mqtt.publish(self.mqttSubscribe, JSON.stringify(self.txStructure))
                        }catch(e){
                            console.log('error updateCommands',e)
                        }
                        break
                    case ('statusCommands'):
                        self.txStructure.txType = 'statusCommandsSuccess'
                        self.txStructure.data = self.commands
                        self.mqtt.publish(self.mqttSubscribe, JSON.stringify(self.txStructure))
                        break
                    case ('status'):
                        self.sendDataViaMqtt('statusSuccess')
                        break
                    default:
                        console.log('unhandled/ignored txType', message.txType)
                }
            }
        } else {
            console.log('unhandled processMqttData')
        }
    }

    handleCommPort(args) {
        let deferred = Q.defer()
        let self = this
        try {
            self.serialPort = new SerialPort(self.commPort, { "baudRate": self.baud, autoOpen: true }, function (err) {
                if (err) {
                    if (err.message != 'Port is opening') {
                        return console.log('RS232 Error: ', err.message);
                    }
                }

            });
        }
        catch (e) {
            console.log('RS232 Error', e)
        }

        self.serialPort.open(function (error) {
            if (error) {
                console.log('failed to open: ' + error);
            }
                console.log('open');
                let bufdata = Buffer.alloc(0)
                setInterval(function () {
                    let locbuf = bufdata
                    bufdata = Buffer.alloc(0)
                    if (locbuf.length > 0) {
                        console.log('data', locbuf)
                        self.process232Data(locbuf)
                    }
                }, 100)

                self.serialPort.on('data', function (data) {
                    const totalLen = bufdata.length + data.length
                    bufdata = Buffer.concat([bufdata, data], totalLen)
                    // bufdata = data
                    console.log('modbus Response',data)
                    // self.process232Data(data)
                });
            
            deferred.resolve(args)
        });
        
        return deferred.promise
    }

    sendDataViaMqtt(txType) {
        let self = this
        let deviceTime = parseInt(new Date().getTime() / 1000 | 0);
        let time = self.compressDateGlog(new Date(deviceTime * 1000), 2);
        self.status.time = time
        self.status.date = new Date()
        self.txStructure.txType = txType
        self.txStructure.data = self.status
        console.log('sendDataViaMqtt', JSON.stringify(self.txStructure))
        self.mqtt.publish(self.mqttSubscribe, JSON.stringify(self.txStructure))
    }

    process232Data(bufdata) {
        let self = this
        console.log('bufdata', bufdata)
        switch (bufdata[1]) {
            case (16):
                self.txStructure.txType = 'controlCarriedOut'
                self.txStructure.data = self.status
                self.mqtt.publish(self.mqttSubscribe, JSON.stringify(self.txStructure))
                break
            case (3):
                let command = self.commands.find(o => o.index === self.index)
                self.index++
                if (self.index >= self.commands.length) {
                    self.index = 0
                }
                let value = bufdata[3]
                value <<= 8
                value += bufdata[4]
                self.status[command.input] = value

                if (command.cofsValue == null) {
                    //init cofsValue
                    command.cofsValue = value
                } else {
                    if (Math.abs(command.cofsValue - value) >= command.cofsSP) {
                        command.cofsValue = value
                        self.sendDataViaMqtt('cofs')
                    }
                }
                break
            default:
                console.log('unhandled modbus functionCode')
        }

    }

    compileWrite(message) {
        let self = this
        // let test = {"control": {"modbusRegister": 6, "value": 200}}
        let bufdata = Buffer.alloc(11)
        bufdata[0] = message.modbusId || 1                      //modbusId
        bufdata[1] = 16                                         //function code
        bufdata[2] = (message.modbusRegister / 256) & 255       //Start Register
        bufdata[3] = message.modbusRegister & 255               //Start Register
        bufdata[4] = (1 / 256) & 255                            //Number Of Register
        bufdata[5] = 1 & 255                                    //Number Of Register
        bufdata[6] = 2                                          //Byte Count
        bufdata[7] = (message.value >> 8) & 255                 //Value
        bufdata[8] = message.value & 255                        //Value

        let crc = self.calculateCRC(bufdata)
        bufdata[9] = crc & 255                                 //crc
        bufdata[10] = (crc >> 8) & 255                          //crc

        self.writeCommand = bufdata

    }
    compileOutputs(args) {
        let deferred = Q.defer()
        let self = this
        for (let i = 0; i < self.commands.length; i++) {
            self.commands[i].output = Buffer.alloc(8)
            self.commands[i].output[0] = self.commands[i].RTUAddress
            self.commands[i].output[1] = self.commands[i].functionCode
            self.commands[i].output[2] = (self.commands[i].register / 256) & 255
            self.commands[i].output[3] = self.commands[i].register & 255
            self.commands[i].output[4] = (2 / 256) & 255   //Register Length
            self.commands[i].output[5] = 2 & 255           //Register Length
            let crc = self.calculateCRC(self.commands[i].output)
            self.commands[i].output[6] = crc & 255
            self.commands[i].output[7] = (crc >> 8) & 255
        }
        deferred.resolve(args)
        return deferred.promise
    }

    calculateCRC(byteData) {
        var x;
        var crc;
        var y;
        var tmp;
        crc = 65535;
        for (x = 0; x < byteData.length - 2; x++) {
            crc ^= byteData[x];
            for (y = 0; y < 8; y++) {
                tmp = (crc & 1);
                crc >>= 1;
                if (tmp != 0) {
                    crc ^= 40961;
                }
            }
        }
        return crc;
    }

    compressDateGlog(adate, atimezone) {
        var vDateValue = 0;
        var date;
        var timezone = atimezone || 2;
        var dateNow = new Date();
        var date = adate || dateNow;

        var hour = 0;
        hour = date.getHours();
        hour = (hour < 10 ? "0" : "") + hour;

        var min = 0;
        min = date.getMinutes();
        min = (min < 10 ? "0" : "") + min;

        var sec = 0;
        sec = date.getSeconds();
        sec = (sec < 10 ? "0" : "") + sec;

        var year = 0;
        year = date.getFullYear() - 2000;

        var month = 0;
        month = date.getMonth() + 1;
        month = (month < 10 ? "0" : "") + month;

        var day = 0;
        day = date.getDate();
        day = (day < 10 ? "0" : "") + day;

        vDateValue = year * (Math.pow(2, 26));
        vDateValue = vDateValue + (month * (Math.pow(2, 22)));
        vDateValue = vDateValue + (day * (Math.pow(2, 17)));
        vDateValue = vDateValue + (hour * (Math.pow(2, 12)));
        vDateValue = vDateValue + (min * (Math.pow(2, 6)));
        vDateValue = vDateValue + (sec * 1);
        // console.log('vDateValue>>>>>>>>>>>',vDateValue)
        return vDateValue;
    }

}
module.exports = edge