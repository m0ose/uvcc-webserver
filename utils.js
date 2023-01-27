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
        result.push({...v, ...infoAndRange})
    }
    return result
}

export async function getInfoAndRange(cam, control) {
    const v = { }
    const val = await cam.get(control)
    v.val = val
    try {
        const range = await cam.range(control)
        v.range = range
    } catch (err) {
        v.range = 'not supported'
        console.log('range request not supported, ', control)
    }
    try {
        const info = await cam.getInfo(control)
        v.info = info
    } catch(err) {
        v.info = 'not supported'
        console.log('info request not supported, ', control)
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

