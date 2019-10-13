# iotedgemodbusmqtt
IoT Edge Router/Controller communicates locally with modbus device and interfaces to the cloud via mqtt

Note this edgeRouter has been tested and verified for use on the bitid.co.za IoT platform providing phone app, push notifications and dashboards.
This edgeRouter can be used with any mqtt server.

To run the test:
Create config.json
{
    "rtuId": 65534,
    "mqttServer": "mqtt://xxx.co.za",
    "mqttPort": 1883,
    "mqttUserName": "xxx",
    "mqttPassword": "xxx",
    "mqttSubscribe": "xxx"
}


example of commands to load. Note the modbus register of 4354 will be placed into input: AI1.
If the value of AI1 changes by more than the cofsSP, the payload will be sent via mqtt.
cofs stands for "change of state"
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

The payload the server receives:
{
    rtuId: this.rtuId,
    txType: 'cofs',         //cofs, fixedTx
    data: {
                time: time,
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
}

To send a modbus write command to this edgeRouter. Note a modbus write is performed with functionCode 16 and only writes a single register
{
    txType: "control",
    data: {
        modbusId: 1,
        modbusRegister: 6,
        value: 200
    }
}