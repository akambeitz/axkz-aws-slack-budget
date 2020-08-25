'use strict';
const AWS = require('aws-sdk');
AWS.config.update({region: 'us-east-2'});
const DDB = new AWS.DynamoDB.DocumentClient();
const axios = require('axios');
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

const getBudgetCategories = async (timeframe) => {
    const params = {
        TableName: "budget",
        KeyConditionExpression: "timeframe = :yymm",
        ExpressionAttributeValues: {
            ":yymm": timeframe
        }
    }
    try {
        const response = await DDB.query(params).promise();
        return get(response, "Items", []);
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

const workflowId = "budget-record-expense";
const workflowCallback = `${workflowId}#submit`;

const modalSubmitBudgetCategoryId = `${workflowCallback}#budget-category`;
const modalSubmitBudgetExpenseId = `${workflowCallback}#budget-expense`;

const buildModalOptionSelectSubmissionBlock = (identifier, options, label, placeholderText = 'Select an option') => {
    return {
        type: 'input',
        block_id: `${identifier}`,
        element: {
            type: 'static_select',
            action_id: `${identifier}`,
            placeholder: { type: 'plain_text', text: `${placeholderText}`, emoji: true },
            options
        },
        label: { type: 'plain_text', text: 'Select a budget category', emoji: true }
    }
}

const buildModalPlainTextSubmissionBlock = (identifier, label, placeholderText = 'Enter a value') => {
    return {
        type: 'input',
        block_id: `${identifier}`,
        element: {
            type: 'plain_text_input',
            action_id: `${identifier}`,
            placeholder: { type: 'plain_text', text: `${placeholderText}`, emoji: true }
        },
        label: { type: 'plain_text', text: `${label}`, emoji: true }
    }
}

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

const generateRecordExpenseModal = async (event) => {
    console.log('Incoming');
    console.log(event);
    try{
        const {trigger_id, user, message, type, callback_id, response_url} = event;
        console.log(message);
        console.log(response_url);

        const budgetCategories = await getBudgetCategories(currentTimeframe());
        console.log(`${budgetCategories.length} budget categories exist for ${currentTimeframe()}`);
        const budgetCategoriesBlock = budgetCategories.map(categoryObject => {
            return {
                "text": {
                    "type": "plain_text",
                    "text": `${categoryObject.category}`,
                },
                "value": `${categoryObject.category}`
            };
        });

        const modal = {
            type: 'modal',
            callback_id: workflowCallback,
            title:  { type: 'plain_text', text: 'Kambeitz Budget' },
            submit: { type: 'plain_text', text: 'Submit' },
            close:  { type: 'plain_text', text: 'Cancel' },
            blocks: [
                buildModalOptionSelectSubmissionBlock(modalSubmitBudgetCategoryId, budgetCategoriesBlock, 'Select an expense category', '- Category -'),
                buildModalPlainTextSubmissionBlock(modalSubmitBudgetExpenseId, 'Enter an expense amount', '0')
            ]
        }

        const response = await axios.post(
            'https://slack.com/api/views.open', 
            {'trigger_id': trigger_id, 'view': modal}, 
            {'headers': {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.SLACK_BOT_BEARER_TOKEN}`
                }
            }
        );

        console.log(response);
        console.log(JSON.stringify(response.data));

        if(response.status === 200) return {statusCode: 200};
        return {statusCode: 500};
    } catch(error){
        console.error(error);
        return {statusCode: 500};
    }
}

module.exports = {
    generateRecordExpenseModal,
    addBudgetCategoryExpense
}