require('dotenv').config()

exports.awsConfig = {
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
}

exports.BUCKET_NAME = process.env.S3_BUCKET_NAME
exports.TABLE_NAME = process.env.DYNAMODB_TABLE_NAME