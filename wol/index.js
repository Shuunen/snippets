var wol = require('wake_on_lan')

// freshy mac
wol.wake('50-46-5D-A3-6E-53', function (error) {
    if (error) {
        console.log('wol : got error', error)
    } else {
        console.log('wol : just sent magic packets !')
    }
})