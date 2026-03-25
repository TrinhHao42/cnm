const express = require('express')
const {
    listTickets,
    showCreateForm,
    showEditForm,
    createTicket,
    updateTicket,
    deleteTicket
} = require('../controllers/TicketController')

const upload = require('../config/multer')

const route = express.Router()

route.get('/', listTickets)
route.get('/tickets', listTickets)
route.get('/tickets/new', showCreateForm)
route.get('/tickets/:ticketId/edit', showEditForm)
route.post('/tickets', upload.single('image'), createTicket)
route.post('/tickets/:ticketId', upload.single('image'), updateTicket)
route.post('/tickets/:ticketId/delete', deleteTicket)

module.exports = route