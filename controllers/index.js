const { ScanCommand, GetCommand, PutCommand, DeleteCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb')
const docClient = require('../config/db')
const { TABLE_NAME } = require('../config/awsConfig')
const { uploadToS3, deleteFromS3 } = require('../config/s3')

const isS3Url = (url) => typeof url === 'string' && url.includes('.amazonaws.com/')
const getStatus = (qty) => qty <= 0 ? 'Het ve' : qty <= 10 ? 'Sap het' : 'Con ve'
const getById = async (id) => {
    const data = await docClient.send(new GetCommand({ TableName: TABLE_NAME, Key: { ticketId: id } }))
    return data.Item || null
}

exports.getList = async (req, res) => {
    const keyword = String(req.query.keyword || '').trim()
    const params = { TableName: TABLE_NAME }
    if (keyword) {
        params.FilterExpression = 'contains(eventName, :kw)'
        params.ExpressionAttributeValues = { ':kw': keyword }
    }
    const data = await docClient.send(new ScanCommand(params))
    const tickets = (data.Items || []).map(t => ({ ...t, status: getStatus(Number(t.quantity)) }))
    res.render('index', { tickets, keyword, message: String(req.query.message || '') })
}

exports.showCreateForm = (req, res) => {
    res.render('form', { mode: 'create', errors: [], ticket: {} })
}

exports.showEditForm = async (req, res) => {
    const ticket = await getById(req.params.ticketId)
    if (!ticket) return res.redirect('/?message=Khong+tim+thay+ve')
    res.render('form', { mode: 'edit', errors: [], ticket })
}

exports.create = async (req, res) => {
    let imageUrl = ''
    if (req.file) imageUrl = await uploadToS3(req.file)
    try {
        await docClient.send(new PutCommand({
            TableName: TABLE_NAME,
            Item: { ...req.validatedTicket, imageUrl, createdAt: new Date().toISOString() },
            ConditionExpression: 'attribute_not_exists(ticketId)'
        }))
        res.redirect('/?message=Them+ve+thanh+cong')
    } catch (error) {
        if (isS3Url(imageUrl)) await deleteFromS3(imageUrl)
        res.status(400).render('form', {
            mode: 'create',
            errors: error?.name === 'ConditionalCheckFailedException' ? ['Ma ve da ton tai'] : ['Khong the them ve'],
            ticket: req.body
        })
    }
}

exports.update = async (req, res) => {
    const existing = await getById(req.params.ticketId)
    if (!existing) return res.redirect('/?message=Khong+tim+thay+ve')
    let newImageUrl = existing.imageUrl || ''
    if (req.file) newImageUrl = await uploadToS3(req.file)
    await docClient.send(new UpdateCommand({
        TableName: TABLE_NAME,
        Key: { ticketId: req.params.ticketId },
        UpdateExpression: 'SET eventName = :n, price = :p, quantity = :q, imageUrl = :i, updatedAt = :u',
        ExpressionAttributeValues: {
            ':n': req.validatedTicket.eventName,
            ':p': req.validatedTicket.price,
            ':q': req.validatedTicket.quantity,
            ':i': newImageUrl,
            ':u': new Date().toISOString()
        }
    }))
    if (req.file && existing.imageUrl && existing.imageUrl !== newImageUrl) {
        deleteFromS3(existing.imageUrl)
    }
    res.redirect('/?message=Cap+nhat+ve+thanh+cong')
}

exports.showDetail = async (req, res) => {
    const ticket = await getById(req.params.ticketId)
    if (!ticket) return res.redirect('/?message=Khong+tim+thay+ve')
    res.render('detail', { ticket })
}

exports.deleteTicket = async (req, res) => {
    const existing = await getById(req.params.ticketId)
    await docClient.send(new DeleteCommand({ TableName: TABLE_NAME, Key: { ticketId: req.params.ticketId } }))
    if (existing?.imageUrl) deleteFromS3(existing.imageUrl)
    res.redirect('/?message=Xoa+ve+thanh+cong')
}