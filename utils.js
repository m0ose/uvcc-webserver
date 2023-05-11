import UVCControl from 'uvc-control'


/**
 * Get the value and range of the supported controls. 
 * 
 * @param {UVCControl} cam 
 * @returns {JSON}
 */
export async function getAllControls(cam) {
    const result = []
    const sc = cam.supportedControls
    for (let i in sc) {
        const ctl = sc[i]
        const v = { i, ctl }
        result.push(v)
    }
    return result
}

/**
 * Get the value and range of the supported controls. 
 * 
 * @param {UVCControl} cam 
 * @returns {JSON}
 */
export async function getAllRanges(cam) {
    const result = []
    const sc = cam.supportedControls
    for (let i in sc) {
        const ctl = sc[i]
        const v = { i, ctl }
        const infoAndRange = await getInfoAndRange(cam, ctl)
        result.push({ ...v, ...infoAndRange })
    }
    return result
}

export async function getInfoAndRange(cam, control) {
    const v = {}
    try{
        const val = await cam.get(control)
        v.val = val
    } catch (err) {
        console.log('get request not supported, ', control, err)
        if(err.error.toString() == 'Error: Device is not open'){
            console.log('device not open, opening')
            await cam.device.open()
            console.log('device open')
        }
    }
    try {
        const info = await cam.getInfo(control)
        v.info = info
    } catch (err) {
        console.log('info request not supported, ', control, err)
    }
    // If info is not supported then a range request will lock it up
    if (v.info) {
        try {
            const range = await cam.range(control)
            v.range = range
        } catch (err) {
            console.log('range request not supported, ', control, err)
        }
    }

    return v
}

/**
 * helper to slow functions down
 * @param {number} timeout 
 * @returns 
 */
export function timeoutPromise(timeout = 1000) {
    return new Promise((resolve, reject) => {
        setTimeout(resolve, timeout)
    })
}

