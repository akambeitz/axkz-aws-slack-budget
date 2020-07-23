'use strict';
const AWS = require('aws-sdk');
AWS.config.update({region: 'us-east-2'});
const DDB = new AWS.DynamoDB.DocumentClient();
const {slackPost} = require("axkz-node-slack-driver/src/postMessage");
const {buildSectionBlock} = require("axkz-node-slack-driver/src/blocks/section");
const {slackUrl, slackChannel, slackUser} = require('../sensitive');

const getBudgetData = async (year, month) => {
  const params = {
    TableName: "budget",
    KeyConditionExpression: "timeframe = :yymm",
    ExpressionAttributeValues: {
        ":yymm": `${year}-${month}`
    }
  }
  try {
    return DDB.query(params).promise().then(response => response.Items);
  } catch (error) {
    console.error(error);
    return [];
  }
};

const buildBudgetReport = monthlyBudgetData => {
  return monthlyBudgetData.map(budgetEntry => {
    const {category, allowance, expenses} = budgetEntry;
    const sumExpenses = expenses.reduce((acc,expense) => {
      return acc + (expense.amount || 0);
    }, 0);
    const remaining = (allowance - sumExpenses);
    return {
      category,
      allowance,
      sumExpenses,
      remaining
    }
  });
};

const convertBudgetReportToSlackBlocks = budgetReport => {
  return budgetReport.map(budgetReportEntry => {
    // TODO: format category name
    const sectionText = `Category: ${budgetReportEntry.category}\n - Budget Remaining: ${budgetReportEntry.remaining} ${
      // distinguish: full, some available, nearly empty, empty, negative, super negative
      budgetReportEntry.remaining === 0 ? ':checkered_flag:' : (budgetReportEntry.remaining > 0 ? ':white_check_mark:' : ':poop:')
    }`
    return buildSectionBlock(sectionText);
  });
};

const postBudgetReportToSlack = async (budgetReportForSlack) => {
  const body = {
    channel: slackChannel,  // TODO: reference env variables
    username: slackUser,
    blocks: [],
    text: ':heavy_dollar_sign:',
    icon_emoji: ':heavy_dollar_sign:'
  };
  await slackPost(slackUrl, body, budgetReportForSlack); 
};

const reportBudget = async event => {
  try{
    const month = event.month || "08";
    const year = "20";
    const monthlyBudgetData = await getBudgetData(year, month);
    console.log(monthlyBudgetData);
    const budgetReport = buildBudgetReport(monthlyBudgetData);
    const budgetReportForSlack = convertBudgetReportToSlackBlocks(budgetReport);
    await postBudgetReportToSlack(budgetReportForSlack);
    return {
      statusCode: 200,
    };
  }
  catch(error){
    console.log(error);
    return {
      statusCode: 500,
      body: error.toString()
    };
  };
};

module.exports = {
  reportBudget
}