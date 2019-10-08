class edge {
    constructor(commPort,baud){
        this.index = 0
        this.commands = [
            {
                index: 0,
                RTUAddress: 1,
                functionCode: 3,
                register: 4354,
                output: []
            },
            {
                index: 1,
                RTUAddress: 1,
                functionCode: 3,
                register: 4355,
                output: []
            }
        ]
    }

    init(){
        try {
            this.serialPort = new SerialPort(commPort, { "baudRate": baudrate, autoOpen: false }, function (err) {
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
    
        serialPort.open(function (error) {
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
    }



    start(interval){
        this.loop = setInterval(() => {
            console.log('sending modbus data', this.commands[this.index].output)
            this.serialPort.write(this.commands[this.index].output.join(' ') + '\r\n')
        },interval || 2000)
    }

    compileOutputs(){
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