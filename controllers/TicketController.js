const {
    ScanCommand,
    GetCommand,
    PutCommand,
    DeleteCommand,
    UpdateCommand
} = require('@aws-sdk/lib-dynamodb')
const docClient = require('../config/db')
const { TABLE_NAME } = require('../config/awsConfig')
const { uploadToS3, deleteFromS3 } = require('../config/s3')

function isS3Url(url) {
    return typeof url === 'string' && url.includes('.amazonaws.com/')
}

function cleanupImageByUrl(imageUrl) {
    if (!imageUrl) return Promise.resolve()
    if (isS3Url(imageUrl)) return deleteFromS3(imageUrl)
    return Promise.resolve()
}

function validateTicket(data) {
    const errors = []

    if (!data.ticketId || data.ticketId.trim() === '') {
        errors.push('Ma ve khong duoc rong')
    }

    if (!data.eventName || data.eventName.trim().length < 3) {
        errors.push('Ten su kien phai co it nhat 3 ky tu')
    }

    if (Number.isNaN(Number(data.price)) || Number(data.price) <= 0) {
        errors.push('Gia ve phai > 0')
    }

    if (Number.isNaN(Number(data.quantity)) || Number(data.quantity) < 0) {
        errors.push('So luong phai >= 0')
    }

    return errors
}

function getTicketStatus(quantity) {
    if (quantity <= 0) return 'Het ve'
    if (quantity <= 10) return 'Sap het'
    return 'Con ve'
}

function normalizeTicketInput(body) {
    return {
        ticketId: String(body.ticketId || '').trim(),
        eventName: String(body.eventName || '').trim(),
        price: Number(body.price),
        quantity: Number(body.quantity)
    }
}

async function getTicketById(ticketId) {
    const data = await docClient.send(new GetCommand({
        TableName: TABLE_NAME,
        Key: { ticketId }
    }))

    return data.Item || null
}

exports.listTickets = async (req, res) => {
    try {
        const keyword = String(req.query.keyword || '').trim()
        const params = { TableName: TABLE_NAME }

        if (keyword) {
            params.FilterExpression = 'contains(eventName, :kw)'
            params.ExpressionAttributeValues = { ':kw': keyword }
        }

        const data = await docClient.send(new ScanCommand(params))
        const tickets = (data.Items || []).map((ticket) => ({
            ...ticket,
            status: getTicketStatus(Number(ticket.quantity))
        }))

        return res.render('index', {
            tickets,
            keyword,
            message: String(req.query.message || '')
        })
    } catch (error) {
        console.error(error)
        return res.status(500).send('Loi khi tai danh sach ve')
    }
}

exports.showCreateForm = (req, res) => {
    return res.render('form', {
        mode: 'create',
        errors: [],
        ticket: {}
    })
}

exports.showEditForm = async (req, res) => {
    try {
        const { ticketId } = req.params
        const ticket = await getTicketById(ticketId)

        if (!ticket) {
            return res.redirect('/?message=Khong+tim+thay+ve')
        }

        return res.render('form', {
            mode: 'edit',
            errors: [],
            ticket
        })
    } catch (error) {
        console.error(error)
        return res.status(500).send('Loi khi tai form sua')
    }
}

exports.createTicket = async (req, res) => {
    let imageUrl = ''
    try {
        const payload = normalizeTicketInput(req.body)
        const errors = validateTicket(payload)

        if (errors.length > 0) {
            return res.status(400).render('form', {
                mode: 'create',
                errors,
                ticket: req.body
            })
        }

        if (req.file) {
            try {
                imageUrl = await uploadToS3(req.file)
            } catch (uploadError) {
                console.error(uploadError)
                imageUrl = ''
            }
        }

        const params = {
            TableName: TABLE_NAME,
            Item: {
                ...payload,
                imageUrl,
                createdAt: new Date().toISOString()
            },
            ConditionExpression: 'attribute_not_exists(ticketId)'
        }

        await docClient.send(new PutCommand(params))

        return res.redirect('/?message=Them+ve+thanh+cong')
    } catch (error) {
        console.error(error)
        if (isS3Url(imageUrl)) {
            await deleteFromS3(imageUrl)
        }
        const duplicate = error && error.name === 'ConditionalCheckFailedException'
        const errors = duplicate
            ? ['Ma ve da ton tai']
            : ['Khong the them ve. Vui long thu lai']

        return res.status(400).render('form', {
            mode: 'create',
            errors,
            ticket: req.body
        })
    }
}

exports.updateTicket = async (req, res) => {
    let imageUrl = ''
    let existingImageUrl = ''
    try {
        const { ticketId } = req.params
        const existing = await getTicketById(ticketId)
        if (!existing) {
            return res.redirect('/?message=Khong+tim+thay+ve')
        }

        existingImageUrl = existing.imageUrl || ''

        const payload = normalizeTicketInput({ ...req.body, ticketId })
        const errors = validateTicket(payload)

        if (errors.length > 0) {
            return res.status(400).render('form', {
                mode: 'edit',
                errors,
                ticket: {
                    ...req.body,
                    ticketId,
                    imageUrl: existing.imageUrl || ''
                }
            })
        }

        imageUrl = existingImageUrl
        if (req.file) {
            try {
                imageUrl = await uploadToS3(req.file)
            } catch (uploadError) {
                console.error(uploadError)
                imageUrl = existingImageUrl
            }
        }

        const params = {
            TableName: TABLE_NAME,
            Key: { ticketId },
            UpdateExpression: 'SET eventName = :eventName, price = :price, quantity = :quantity, imageUrl = :imageUrl, updatedAt = :updatedAt',
            ExpressionAttributeValues: {
                ':eventName': payload.eventName,
                ':price': payload.price,
                ':quantity': payload.quantity,
                ':imageUrl': imageUrl,
                ':updatedAt': new Date().toISOString()
            }
        }

        await docClient.send(new UpdateCommand(params))

        if (req.file && existingImageUrl && existingImageUrl !== imageUrl) {
            await cleanupImageByUrl(existingImageUrl)
        }

        return res.redirect('/?message=Cap+nhat+ve+thanh+cong')
    } catch (error) {
        console.error(error)
        if (req.file && imageUrl && imageUrl !== existingImageUrl) {
            await cleanupImageByUrl(imageUrl)
        }
        return res.status(500).send('Loi khi cap nhat ve')
    }
}

exports.deleteTicket = async (req, res) => {
    try {
        const { ticketId } = req.params
        const existing = await getTicketById(ticketId)

        const params = {
            TableName: TABLE_NAME,
            Key: { ticketId }
        }

        await docClient.send(new DeleteCommand(params))

        if (existing && existing.imageUrl) {
            await cleanupImageByUrl(existing.imageUrl)
        }

        return res.redirect('/?message=Xoa+ve+thanh+cong')
    } catch (error) {
        console.error(error)
        return res.status(500).send('Loi khi xoa ve')
    }
}