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
        // const val = await cam.get(ctl)
        // v.val = val
        // try {
        //     const range = await cam.range(ctl)
        //     v.range = range
        // } catch (err) {
        //     console.log('range request not supported, ', ctl)
        // }
        result.push(v)
    }
    return result
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

