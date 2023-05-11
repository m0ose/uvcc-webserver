/**
 * A web server to control the settings for uvc based webcams(most USB cameras)
 * 
 * _cody_s 2023
 */


import { timeoutPromise, getAllControls, getAllRanges, getInfoAndRange } from './utils.js'
import express from 'express'
import cors from 'cors'
import UVCControl from 'uvc-control'

console.log('starting server', cors)
/**
 * state variables
 */
const app = express()
app.use(cors())
const cameras = []
const TOTALLY_UNSUPPORTED = ['OBSBOT Tiny 4K']
/**
 * Get camera by either name, adress, or vendor ID
 * Cache cameras because making them is expensive.
 * 
 * @param {String} identifier 
 * @returns {UVCControl}  
*/
async function getCameraByIdentifier(identifier) {
    // check cached cameras
    const existingCam = cameras.find(x => {
        const d = x.device
        if (d.name.includes( identifier)) return true
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
        if (d.name.includes(identifier)) return true
        if(identifier.includes(d.name)) return true
        if (d.deviceAddress == identifier) return true
        if (d.deviceDescriptor.idVendor == identifier) return true
        return false
    })
    if (!device) {
        throw('device not found')
        // return
        // device = devices[0]
    }
    const isUnsupported = TOTALLY_UNSUPPORTED.find(x => device.name.includes(x))
    if(isUnsupported){
        console.warn('device is unsupported', device.name)
        throw('device is unsupported')
    }
    const vid = device.deviceDescriptor.idVendor
    const pid = device.deviceDescriptor.idProduct
    const deviceAddress = device.deviceAddress
    const params = { vid, pid, deviceAddress }
    console.log('making new camera', params)
    const cam = new UVCControl(params)
    cameras.push(cam)
    // take a short break because a requests to this device will not work until something internal is ready
    // TODO figure out if there is some event or variable to look for that says it is ready.
    await timeoutPromise(80)
    return cam
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

app.get('/info/:deviceIdentifier', async (req, res) => {
    let cam
    try {
        cam = await getCameraByIdentifier(req.params.deviceIdentifier)
        const ranges = await getAllRanges(cam)
        res.send(ranges)
    } catch (err) {
        console.error(err)
        res.status(500).send(err)
        return
    }
})

app.get('/info/:deviceIdentifier/:control', async (req, res) => {
    let cam
    try {
        cam = await getCameraByIdentifier(req.params.deviceIdentifier)
        const info = await getInfoAndRange(cam, req.params.control)
        res.send(info)
    } catch (err) {
        console.error(err)
        res.status(500).send(err)
    }
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
        console.error(err)
        res.status(500).send(err)
    }
})

// TODO make this a POST instead. It doesn't seem to get called with post
// app.post('/set/:deviceIdentifier/:control/:values', async (req, res) => {
app.get('/set/:deviceIdentifier/:control/:values', async (req, res) => {
    let values = req.params.values.split(',')
    console.log('setting', req.params.control, values)
    try {
        const cam = await getCameraByIdentifier(req.params.deviceIdentifier)
        const retVals = await cam.set(req.params.control, values)
        res.send(retVals)
    } catch (err) {
        console.error(err)
        res.status(500).send(err)
    }
})

app.listen(3456, () => {
    console.log('Server listening on port 3456')
})
