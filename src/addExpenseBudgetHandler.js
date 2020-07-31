'use strict';
const AWS = require('aws-sdk');
AWS.config.update({region: 'us-east-2'});
const DDB = new AWS.DynamoDB.DocumentClient();
const get = require('lodash.get');
const {currentTimeframe} = require('./utilities');

const getBudgetCategoryData = async (timeframe, category) => {
    const params = {
        TableName: "budget",
        KeyConditionExpression: "timeframe = :yymm and category = :c",
        ExpressionAttributeValues: {
            ":yymm": timeframe,
            ":c": category
        }
    }
    try {
        const response = await DDB.query(params).promise();
        return get(response, "Items[0]", {});
    } catch (error) {
        console.error(error);
        return [];
    }
};

const updateBudgetCategoryData = async (category, timeframe, updatedExpenses) => {
    const params = {
        TableName: 'budget',
        Key: {
          'category': category,
          'timeframe': timeframe
        },
        UpdateExpression: 'set expenses = :e',
        ExpressionAttributeValues: {
          ':e': updatedExpenses
        }
      }
    return await DDB.update(params).promise();
};

const addBudgetCategoryExpense = async event => {
    const {category, amount, description} = event;
    if(category === undefined || category === "") return {statusCode: 400};
    if(amount === undefined) return {statusCode: 400};
    const descriptionBase = (description !== undefined && description !== "") ? description : "No description provided";
    const currentDate = new Date();
    const timeframe = currentTimeframe();
    const descriptionFinal = `${currentDate.toGMTString()} : ${descriptionBase}`;
    const categoryBudgetData = await getBudgetCategoryData(currentTimeframe(), category);
    const updatedExpenses = get(categoryBudgetData, "expenses", []).concat([{
        amount,
        description: descriptionFinal
    }])
    await updateBudgetCategoryData(category, timeframe, updatedExpenses);
    return {statusCode: 200};
};

module.exports = {
    addBudgetCategoryExpense
}