const express = require('express')
const UVCControl = require('uvc-control')

const app = express()

const cameras = []

/**
 * 
 * @param {String} identifier 
 * @returns {UVCControl}
// check the port first, id ,maker,
// default to first if there is only one, or identifier is 0, or undefined
//    need to check if port 0 is used. If so -1 or null
//    throw error if not found or no usb cameras are available. 
// cache the cameras .  
*/
async function getCameraByIdentifier(identifier) {
    // check cached cameras
    const existingCam = cameras.findLast(x => {
        const d = x.device
        if (d.name == identifier) return true
        if (d.deviceAddress == identifier) return true
        if (d.deviceDescriptor.idVendor == identifier) return true
        return false
    })
    if(existingCam){
        return existingCam
    }
    // look through devices. This is slow and seems to hinder the subsequent requests if they happen too soon 
    const devices = await UVCControl.discover()
    if (!devices || devices.length <= 0) {
        throw ('No Cameras found')
    }
    let device = devices.findLast(d => {
        if (d.name == identifier) return true
        if (d.deviceAddress == identifier) return true
        if (d.deviceDescriptor.idVendor == identifier) return true
        return false
    })
    if (!device) {
        console.warn('device not found. Returning default', identifier)
        device = devices[0]
    }
    const vid = device.deviceDescriptor.idVendor
    const pid = device.deviceDescriptor.idProduct
    const deviceAddress = device.deviceAddress
    const arguments = { vid, pid, deviceAddress }
    console.log('making new camera', arguments)
    const cam = new UVCControl(arguments)
    cameras.push(cam)
    await timeoutPromise(80)
    return cam
}

async function getAllControls(cam){
    const result=[]
    const sc = cam.supportedControls
    for(let i in sc){
        const ctl = sc[i]
        const v = {i, ctl}
        const val = await cam.get(ctl)
        v.val = val 
        try{
            const range = await cam.range(ctl)
            v.range = range
        }catch(err){
            console.log('range request not supported, ', ctl)
        }
        result.push(v)
    }
    return result
}

function timeoutPromise(timeout=1000){
    return new Promise((resolve, reject)=>{
        setTimeout(resolve, timeout)
    })
}

app.get('/', (req, res) => {
    res.send('Hello World!')
})

app.get('/devices', async (req, res) => {
    console.log('devices called')
    console.time('devices')
    const devices = await UVCControl.discover() // this is slow ~250ms
    res.send(JSON.stringify(devices, 0, 2))
    console.timeEnd('devices')
})

app.get('/controls/:deviceIdentifier', async (req, res) => {
    console.log('controls', req.params.deviceIdentifier)
    let cam
    try {
        cam = await getCameraByIdentifier(req.params.deviceIdentifier)
        const controls = await getAllControls(cam)
        res.send(controls)
    } catch (err) {
        console.error(err)
        res.status(500).send(err)
        return
    }
 

})

app.get('/get/:deviceIdentifier/:control', async (req, res) => {
    console.log('getting', req.params.control)
    try {
        const cam = await getCameraByIdentifier(req.params.deviceIdentifier)
        await timeoutPromise(120)
        const retVals = await cam.get(req.params.control)
        res.send(retVals)
    } catch (err) {
        res.status(500).send(err)
    }
})

app.post('/set/:deviceIdentifier/:control/:values', async (req, res) => {
    let values = req.params.values.split(',')
    console.log('setting', req.params.control, values)
    try {
        const cam = await getCameraByIdentifier(req.params.deviceIdentifier)
        const retVals = await cam.set(req.params.control, values)
        res.send(JSON.stringify([retVals]))
    } catch (err) {
        res.status(500).send(err)
    }
})

app.listen(3000, () => {
    console.log('Server listening on port 3000')
})
