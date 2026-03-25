require('dotenv').config()

const ticketRoute = require('./routes/ticketRoutes')

const express = require('express')
const path = require('path')
const app = express()

app.set('view engine', 'ejs')
app.set('views', path.join(__dirname, 'views'))

const PORT = process.env.PORT

app.use(express.urlencoded({ extended: true}))
app.use(express.json())
app.use(express.static('public'))
app.use('/uploads', express.static(path.join(__dirname, 'uploads')))

app.use(ticketRoute)

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`)
})