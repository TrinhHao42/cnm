const uuid = require('uuid')
const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3')
const { awsConfig, BUCKET_NAME } = require('./awsConfig')

const s3 = new S3Client(awsConfig)

exports.uploadToS3 = async (file) => {
    const fileName = uuid.v4()

    const command = new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: fileName,
        Body: file.buffer,
        ContentType: file.mimetype
    })

    await s3.send(command)

    return `https://${BUCKET_NAME}.s3.${awsConfig.region}.amazonaws.com/${fileName}`
}

exports.deleteFromS3 = async (fileUrl) => {
    try {
        if (!fileUrl) return

        const url = new URL(fileUrl)
        const key = url.pathname.substring(1)

        const command = new DeleteObjectCommand({
            Bucket: BUCKET_NAME,
            Key: key
        })

        await s3.send(command)
    } catch (error) {
        console.error(error)
    }
}