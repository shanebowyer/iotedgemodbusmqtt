'use strict'

var Q           = require('q');

class edge {
    constructor(commPort,baud, commands){
        this.commPort = commPort
        this.baud = baud
        this.index = 0

        this.status = {
            AI1: 0,
            AI2: 0,
            AI3: 0,
            AI4: 0
        }

        this.commands = commands
        this.commands = [
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
        this.init()
    }

    async init(){
        let response = {}
        let self = this
        try{
            response = await this.compileOutputs(response)
            // response = await this.handleCommPort(response)
            self.start(2000)
        }catch(e){
            console.log('init Error',e)
        }
    }

    handleCommPort(args){
        let deferred = Q.defer()
        try {
            this.serialPort = new SerialPort(this.commPort, { "baudRate": this.baud, autoOpen: false }, function (err) {
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
    
        this.serialPort.open(function (error) {
            if (error) {
                console.log('failed to open: ' + error);
            } else {
                console.log('open');
                let bufdata = Buffer.alloc(0)
                setInterval(function () {
                    let locbuf = bufdata
                    bufdata = Buffer.alloc(0)
                    if(locbuf.length > 0){
                        console.log('data',locbuf)
                        // self.emit("data", locbuf);
                        self.process232Data(locbuf)
                    }
                }, 1000)					
                
                serialPort.on('data', function (data) {
                    const totalLen = bufdata.length + data.length
                    bufdata = Buffer.concat([bufdata, data], totalLen)
                });
            }
        });
        deferred.resolve(args)
        return deferred.promise
    }

    process232Data(bufdata){
        console.log('bufdata',bufdata)
        let command = this.commands.find(o => o.index === this.index)
        this.index++
        if(this.index >= this.commands.length){
            this.index = 0
        }
        let value = bufdata[3]
        value <<= 8
        value += bufdata[4]
        this.status[command.input] = value

        if(command.cofsValue == null){
            //init cofsValue
            command.cofsValue = value
        }else{
            if(Math.abs(command.cofsValue - value) >= command.cofsSP){
                command.cofsValue = value
                console.log('send data to server via mqtt', this.status)
            }
        }

    }

    start(interval){
        this.loop = setInterval(() => {
            console.log('sending modbus data', this.commands[this.index].output.join(' ') + '\r\n')
            // this.serialPort.write(this.commands[this.index].output.join(' ') + '\r\n')
        },interval || 2000)
    }

    compileOutputs(args){
        let deferred = Q.defer()
        for(let i=0;i<this.commands.length;i++){
            this.commands[i].output.push(this.commands[i].RTUAddress)
            this.commands[i].output.push(this.commands[i].functionCode)
            this.commands[i].output.push((this.commands[i].register / 256) & 255)
            this.commands[i].output.push(this.commands[i].register & 256)
            this.commands[i].output.push((1 / 256) & 255)   //Register Length
            this.commands[i].output.push(1 & 255)           //Register Length
            let crc = this.calculateCRC(this.commands[i].output)
            this.commands[i].output.push(crc & 255)
            this.commands[i].output.push((crc >> 8) & 255)
        }
        deferred.resolve(args)
        return deferred.promise
    }

    calculateCRC(byteData){
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
module.exports = edge