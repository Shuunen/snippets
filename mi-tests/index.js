const miio = require('miio')

// Resolve a device, resolving the token automatically if possible
/*
miio.device({ address: '192.168.31.170' })
    .then(console.log)
    .catch(console.error)
    */

/*
Device ID: 54996416
Model info: Unknown
Address: 192.168.31.170
Token: 82e4dd77249c64418d6d12eb363e57e6 via auto-token

Device ID: 54959128
type: 'gateway',
model: 'lumi.gateway.v3',
port: 54321,
Model info: Unknown
Address: 192.168.31.54
Token: 518b93de5e39c501ec5270fc79c2f9a1 via auto-token

Device ID: 158d000155eea6
Model info: lumi.sensor_ht (sensor)
Address: Owned by 54959128

Device ID: 158d00014d1eef
Model info: lumi.magnet (magnet)
Address: Owned by 54959128

Device ID: 158d0001563ed0
Model info: lumi.switch (controller)
Address: Owned by 54959128
WXKG01LM
CMIIT ID : 2015DP0290

Device ID: 158d0001562106
Model info: lumi.motion (motion)
Address: Owned by 54959128

Device ID: 158d00015304c8
Model info: lumi.plug (power-plug)
Address: Owned by 54959128
*/

/* 
const devices = miio.devices({
    cacheTime: 300 // 5 minutes. Default is 1800 seconds (30 minutes)
});

devices.on('available', reg => {
    if (!reg.token) {
        console.log(reg.id, 'hides its token');
        return;
    }

    const device = reg.device;
    if (!device) {
        console.log(reg.id, 'could not be connected to');
        return;
    }

    // Do something useful with the device
    console.log(reg.id, 'is available !')

    if (device.type === 'gateway') {
        // console.log(device.devApi)
        // console.log('prepare to receive new device...')
        // device.addDevice()
        console.log('devices list', device.devices())
    }

    // All devices have a propertyChanged event
    device.on('propertyChanged', e => console.log(e.property, e.oldValue, e.value));

    // Some devices have custom events
    device.on('action', e => console.log('Action performed:', e.id));

    // Discover the token of a device:
    // device.discover().then(info => console.log(info.token)); // device.discover is not a function
});

devices.on('unavailable', reg => {
    if (!reg.device) return;

    // Do whatever you need here
    console.log(reg.device, 'is not available anymore !');
});

devices.on('error', err => {
    // err.device points to info about the device
    console.log('Something went wrong connecting to device', err);
});
*/

/* 
   
const device = miio.createDevice({
    address: '192.168.31.54',
    token: '518b93de5e39c501ec5270fc79c2f9a1',
    model: 'lumi.gateway'
})

device.init()
    .then(() => {
        console.log('device is ready for commands :)', device.actions)
        device.on('propertyChanged', e => console.log(e.property, e.oldValue, e.value));
        device.on('action', e => console.log('Action performed:', e.id));
        // device.discover().then(info => console.log(info.token)); // device.discover is not a function
    })
    .catch(console.error);
 */



/*
const browser = miio.browse({
    cacheTime: 300 // 5 minutes. Default is 1800 seconds (30 minutes)
});

const devices = {};
browser.on('available', reg => {
    if (!reg.token) {
        console.log(reg.id, 'hides its token');
        return;
    }

    miio.device(reg)
        .then(device => {
            devices[reg.id] = device;

            // Do something useful with the device
            console.log(device, 'is available !')
        })
        .catch(error => {
            console.log('error happend', error)
        });
});
*/

const Aqara = require('lumi-aqara')

const aqara = new Aqara()

aqara.on('gateway', (gateway) => {
    console.log('Gateway discovered')
    gateway.on('ready', () => {
        console.log('Gateway is ready')
        gateway.setPassword('sotxcen2i4otuj7z')
        gateway.setColor({ r: 255, g: 0, b: 0 })
        gateway.setIntensity(100)
    })

    gateway.on('offline', () => {
        gateway = null
        console.log('Gateway is offline')
    })

    gateway.on('subdevice', (device) => {
        console.log('New device')
        console.log(`  Battery: ${device.getBatteryPercentage()}%`)
        console.log(`  Type: ${device.getType()}`)
        console.log(`  SID: ${device.getSid()}`)
        switch (device.getType()) {
            case 'magnet':
                console.log(`  Magnet (${device.isOpen() ? 'open' : 'close'})`)
                device.on('open', () => {
                    console.log(`${device.getSid()} is now open`)
                })
                device.on('close', () => {
                    console.log(`${device.getSid()} is now close`)
                })
                break
            case 'switch':
                console.log(`  Switch`)
                device.on('click', () => {
                    console.log(`${device.getSid()} is clicked`)
                })
                device.on('doubleClick', () => {
                    console.log(`${device.getSid()} is double clicked`)
                })
                device.on('longClickPress', () => {
                    console.log(`${device.getSid()} is long pressed`)
                })
                device.on('longClickRelease', () => {
                    console.log(`${device.getSid()} is long released`)
                })
                break
        }
    })

    gateway.on('lightState', (state) => {
        console.log(`Light updated: ${JSON.stringify(state)}`)
    })
})