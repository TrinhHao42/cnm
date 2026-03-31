const express = require('express')
const {
    getList,
    showCreateForm,
    showEditForm,
    showDetail,
    create,
    update,
    deleteTicket
} = require('../controllers')

const upload = require('../config/multer')
const { validateTicketMiddleware } = require('../config/validation')

const route = express.Router()

route.get('/', getList)
route.get('/tickets', getList)
route.get('/tickets/new', showCreateForm)
route.get('/tickets/:ticketId', showDetail)
route.get('/tickets/:ticketId/edit', showEditForm)
route.post('/tickets', upload.single('image'), validateTicketMiddleware('create'), create)
route.post('/tickets/:ticketId', upload.single('image'), validateTicketMiddleware('edit'), update)
route.post('/tickets/:ticketId/delete', deleteTicket)

module.exports = route