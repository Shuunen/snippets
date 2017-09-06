const express = require('express')
const cors = require('cors')
const app = express()
const basicAuth = require('express-basic-auth')

app.use(cors())

app.use(basicAuth({ users: { 'foo': 'bar' }, challenge: true }))

app.get('/', (req, res) => res.status(200).send('If you see this, you\'re authenticated :)'))

app.listen(3000, () => console.log('Api with basic auth listening on port 3000'))
