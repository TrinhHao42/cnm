function normalizeTicketInput(body) {
    return {
        ticketId: String(body.ticketId || '').trim(),
        eventName: String(body.eventName || '').trim(),
        price: Number(body.price),
        quantity: Number(body.quantity)
    }
}

function validateTicket(data) {
    const errors = []
    if (!data.ticketId) errors.push('Ma ve khong duoc rong')
    if (!data.eventName || data.eventName.length < 3) errors.push('Ten su kien phai co it nhat 3 ky tu')
    if (Number.isNaN(data.price) || data.price <= 0) errors.push('Gia ve phai > 0')
    if (Number.isNaN(data.quantity) || data.quantity < 0) errors.push('So luong phai >= 0')
    return errors
}

function validateTicketMiddleware(mode = 'create') {
    return (req, res, next) => {
        const body = mode === 'edit' ? { ...req.body, ticketId: req.params.ticketId } : req.body
        const payload = normalizeTicketInput(body)
        const errors = validateTicket(payload)

        if (errors.length > 0) {
            return res.status(400).render('form', { mode, errors, ticket: req.body })
        }

        req.validatedTicket = payload
        next()
    }
}

module.exports = {
    validateTicket,
    normalizeTicketInput,
    validateTicketMiddleware
}
