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

const modalSubmitBudgetCategoryExpenseCallbackId = `budget#submit-category-expense`;
const modalSubmitBudgetCategoryId = `${modalSubmitBudgetCategoryExpenseCallbackId}$category`;
const modalSubmitBudgetExpenseId = `${modalSubmitBudgetCategoryExpenseCallbackId}$expense`;

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
        label: { type: 'plain_text', text: label, emoji: true }
    }
}

const buildModalPlainTextSubmissionBlock = (identifier, label, placeholderText = 'Enter a value') => {
    return {
        type: 'input',
        block_id: `${identifier}`,
        element: {
            type: 'plain_text_input',
            action_id: `${identifier}`,
            placeholder: { type: 'plain_text', text: `${placeholderText}`, emoji: true },
            max_length: 1000
        },
        label: { type: 'plain_text', text: `${label}`, emoji: true }
    }
}

const addBudgetCategoryExpense = async event => {
    try{
        console.log(JSON.stringify(event));
        const state = get(event, 'view.state.values', {});
        console.log(state);
        const category = get(state, `${modalSubmitBudgetCategoryId}.${modalSubmitBudgetCategoryId}.selected_option.value`);
        const expenseRaw = get(state, `${modalSubmitBudgetExpenseId}.${modalSubmitBudgetExpenseId}.value`, '0');
        const expense = parseInt(expenseRaw.replace('$',''),10);
        const description = get(JSON.parse(get(event, `view.private_metadata`, '{}')), 'description', '');
        console.log(`Received expense: ${expense} toward ${category} (${description})`);

        if(category === undefined || category === "") return {statusCode: 400};
        if(expense === undefined) return {statusCode: 400};

        const descriptionBase = (description !== undefined && description !== '') ? description : 'No description provided';
        const currentDate = new Date();
        const descriptionFinal = `${currentDate.toGMTString()} : ${descriptionBase}`;
        const categoryBudgetData = await getBudgetCategoryData(currentTimeframe(), category);
        const updatedExpenses = get(categoryBudgetData, "expenses", []).concat([{
            amount: expense,
            description: descriptionFinal
        }])
        await updateBudgetCategoryData(category, currentTimeframe(), updatedExpenses);
        console.log(`Wrote expense to DDB for ${currentTimeframe()}`);
        return {statusCode: 200};
    }catch(error){
        console.error(error);
        return {statusCode: 500}
    }
};

const generateRecordExpenseModal = async (event) => {
    console.log('Incoming');
    console.log(event);
    try{
        const {trigger_id, user, message, type, callback_id, response_url} = event;

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
            callback_id: modalSubmitBudgetCategoryExpenseCallbackId,
            title:  { type: 'plain_text', text: 'Kambeitz Budget' },
            submit: { type: 'plain_text', text: 'Submit' },
            close:  { type: 'plain_text', text: 'Cancel' },
            blocks: [
                buildModalOptionSelectSubmissionBlock(modalSubmitBudgetCategoryId, budgetCategoriesBlock, 'Select an expense category', '- Category -'),
                buildModalPlainTextSubmissionBlock(modalSubmitBudgetExpenseId, 'Enter an expense amount', '0')
            ],
            private_metadata: JSON.stringify({
                description: get(message, 'text', '')
            })
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