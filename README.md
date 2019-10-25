# iotedgemodbusmqtt
https://bitid.co.za

https://blog.bitid.co.za/iotedgemodbusmqtt

<h1>IoT Edge Router/Controller communicates locally with modbus device and interfaces to the cloud via mqtt</h1>

<p align="center">
  <img src="https://lh3.googleusercontent.com/eeg5_R7aSlCbE__P-R8QisHuu2VG6uQkwjZ7nuNkS0AFkmlW0qPBeOIp8LinJEjeXd6QQYWsvQ=w371">
</p>

*Note this edgeRouter has been tested and verified for use on the bitid.co.za IoT platform providing phone app, push notifications and dashboards.
This edgeRouter can be used with any mqtt server.*

Modbus Registers are read continously and monitored for when they change. When a change is detected, the change is sent via MQTT to the server.
Change Modbus Register values remotely via MQTT
Monitor and Control via any MQTT client (Nice for Smart Phone use)



# config.js
To run the test:
Create config.json
```JSON
{
    "rtuId": 65534,
    "mqttServer": "mqtt://xxx.co.za",
    "mqttPort": 1883,
    "mqttUserName": "xxx",
    "mqttPassword": "xxx",
    "mqttSubscribe": "xxx"
}
```

# Read Commands

<h3>IMPORTANT! - Ensure index starts at zero and increments accordingly</h3>
Because read commands are done on a continuous basis, they can be preloaded on startup. The read commands
can be changed over the MQTT connection at any time.

Below is an example of commands to load on startup. Note the modbus register of **4354** will be placed into input: **AI1**.
If the value of AI1 changes by more than the cofsSP, the payload will be sent via mqtt.
**cofs** stands for **"change of state"**

```javascript
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
```
# Update Read Commands

Send via MQTT

```JSON
{
    txType: "updateCommands",
    commands = [
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
}
```

# Write Command
<h2>Control your modbus device remotely</h2>
To send a modbus write command to this edgeRouter. Note a modbus write is performed with functionCode 16 and only writes a single register.
Send the following payload via MQTT

```JSON
{
    txType: "control",
    data: {
        modbusId: 1,
        modbusRegister: 6,
        value: 200
    }
}
```

# Status Command
<h2>To request current status of modbus registers</h2>
Send the following via MQTT

```JSON
{
    txType: "statusCommands",
    data: null
}
```
# Server-Side Payload
<h2>On Change of State (COFS) and/or Fixed Transmit(TX) Time Base</h2>
The payload the server receives:

```JSON
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
```
# Example - How to use this package

```javascript
'use strict'

let edgeRouter = require('iotedgemodbusmqtt')
let config = require('./config.json')


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

let options = {
    rtuId: config.rtuId,
    commPort: '/dev/ttyUSB0',
    baud: 19200 , 
    commands: commands, 
    mqttServer: config.mqttServer,
    mqttPort: config.mqttPort,
    mqttUserName: config.mqttUserName,
    mqttPassword: config.mqttPassword,
    mqttSubscribe: config.mqttSubscribe, 
    txTimeSP: 10,
    enable232: 'true'
}

edgeRouter.start(options)

```

# MODBUS TCP
Currently this module only supports serial communication. I will be adding MODBUS TCP soon!
