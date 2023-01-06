/**
 * A web server to control the settings for uvc based webcams(most USB cameras)
 * 
 * _cody_s 2023
 */



const express = require('express')
const UVCControl = require('uvc-control')

/**
 * state variables
 */
const app = express()
const cameras = []

/**
 * Get camera by either name, adress, or vendor ID
 * Cache cameras because making them is expensive.
 * 
 * @param {String} identifier 
 * @returns {UVCControl}  
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
    if (existingCam) {
        return existingCam
    }
    // Create camera
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
    // take a short break because a requests to this device will not work until something internal is ready
    // TODO figure out if there is some event or variable to look for that says it is ready.
    await timeoutPromise(80)
    return cam
}

/**
 * Get the value and range of the supported controls. 
 * 
 * @param {UVCControl} cam 
 * @returns {JSON}
 */
async function getAllControls(cam) {
    const result = []
    const sc = cam.supportedControls
    for (let i in sc) {
        const ctl = sc[i]
        const v = { i, ctl }
        const val = await cam.get(ctl)
        v.val = val
        try {
            const range = await cam.range(ctl)
            v.range = range
        } catch (err) {
            console.log('range request not supported, ', ctl)
        }
        result.push(v)
    }
    return result
}

/**
 * helper to slow functions down
 * @param {number} timeout 
 * @returns 
 */
function timeoutPromise(timeout = 1000) {
    return new Promise((resolve, reject) => {
        setTimeout(resolve, timeout)
    })
}

app.get('/', (req, res) => {
    res.send('Hello World!')
})

app.get('/devices', async (req, res) => {
    console.time('devices')
    const devices = await UVCControl.discover() // this is slow ~250ms
    res.send(devices)
    console.timeEnd('devices')
})

app.get('/controls/:deviceIdentifier', async (req, res) => {
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
    try {
        const cam = await getCameraByIdentifier(req.params.deviceIdentifier)
        await timeoutPromise(120)
        const retVals = await cam.get(req.params.control)
        res.send(retVals)
    } catch (err) {
        res.status(500).send(err)
    }
})

app.post('/boo', async (req, res) => {
    console.log('booooo')
    res.send("hello")
})

// TODO make this a POST instead
app.get('/set/:deviceIdentifier/:control/:values', async (req, res) => {
    let values = req.params.values.split(',')
    console.log('setting', req.params.control, values)
    try {
        const cam = await getCameraByIdentifier(req.params.deviceIdentifier)
        const retVals = await cam.set(req.params.control, values)
        res.send(retVals)
    } catch (err) {
        res.status(500).send(err)
    }
})

app.listen(3000, () => {
    console.log('Server listening on port 3000')
})
