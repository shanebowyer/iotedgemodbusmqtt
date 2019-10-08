'use strict'

var chai        = require('chai');
var chaiSubset  = require('chai-subset');
chai.use(chaiSubset);

let edgeRouter = require('../index')

describe.only('test edgeRouter', function(){
    it('start test', function(){
        edgeRouter.start('/dev/ttyUSB0',19200,[])
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

    it('simulate data 259 for index 0', function(){
        let bufdata = Buffer.alloc(6)
        bufdata[0] = 1      //rtuid
        bufdata[1] = 3      //function code
        bufdata[2] = 1      //number of registers
        bufdata[3] = 1      //data
        bufdata[4] = 3      //data
        bufdata[5] = 255    //crc
        bufdata[6] = 255    //crc
        edgeRouter.simulateData(bufdata)
    })

})