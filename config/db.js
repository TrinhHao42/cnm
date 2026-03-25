const { DynamoDBClient } = require('@aws-sdk/client-dynamodb')
const { DynamoDBDocumentClient } = require('@aws-sdk/lib-dynamodb')
const { awsConfig } = require('./awsConfig')

module.exports = DynamoDBDocumentClient.from(new DynamoDBClient(awsConfig))