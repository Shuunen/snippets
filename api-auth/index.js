const express = require('express')
const cors = require('cors')
const app = express()
const basicAuth = require('basic-auth')

const auth = function (req, res, next) {
    function unauthorized(res) {
        res.set('WWW-Authenticate', 'Basic realm=Authorization Required')
        return res.send(401)
    }

    const user = basicAuth(req)

    if (!user || !user.name || !user.pass) {
        return unauthorized(res)
    }

    if (user.name === 'foo' && user.pass === 'bar') {
        return next()
    } else {
        return unauthorized(res)
    }
}

app.use(cors())

app.get('/', auth, function (req, res) {
    res.status(200).send('Authenticated :)')
})

app.listen(3000, function () {
    console.log('Api Auth listening on port 3000')
})