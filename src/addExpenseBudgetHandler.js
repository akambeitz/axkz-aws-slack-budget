'use strict';
const AWS = require('aws-sdk');
AWS.config.update({region: 'us-east-2'});
const DDB = new AWS.DynamoDB.DocumentClient();
const get = require('lodash.get');

const getBudgetCategoryData = async (year, month, category) => {
    const params = {
        TableName: "budget",
        KeyConditionExpression: "timeframe = :yymm and category = :c",
        ExpressionAttributeValues: {
            ":yymm": `${year}-${month}`,
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

const addBudgetCategoryExpense = async event => {
    const {category, amount, description} = event;
    if(category === undefined || category === "") return {statusCode: 400};
    if(amount === undefined) return {statusCode: 400};
    const descriptionBase = (description !== undefined && description !== "") ? description : "No description provided";
    const currentDate = new Date();
    const descriptionFinal = `${currentDate.toGMTString()} : ${descriptionBase}`;
    const categoryBudgetData = await getBudgetCategoryData("20","08",category);
    const updatedExpenses = get(categoryBudgetData, "expenses", []).concat([{
        amount,
        description: descriptionFinal
    }])
    const params = {
        TableName: 'budget',
        Key: {
          'category': categoryBudgetData.category,
          'timeframe': categoryBudgetData.timeframe
        },
        UpdateExpression: 'set expenses = :e',
        ExpressionAttributeValues: {
          ':e': updatedExpenses
        }
      }
    await DDB.update(params).promise();
    return {statusCode: 200};
};

addBudgetCategoryExpense({
    category: "fun-alex",
    amount: 0,
    description: ""
}).then(x => console.log(x)).catch(x => console.log(x));