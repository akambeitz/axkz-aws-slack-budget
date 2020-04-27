'use strict';
const AWS = require('aws-sdk');
const DDB = new AWS.DynamoDB.DocumentClient();
const axios = require('axios');

AWS.config.update({region: 'us-east-2'});
const slackURL = process.env.SLACK_INCOMING_WEBHOOK_URL; 
const slackPositiveEmoji = ':heavy_dollar_sign:';
const slackNegativeEmoji = ':poop:';

const ddbGetItem = (ddbParam) => {
  return DDB.get(ddbParam).promise().then(response => response.Item);
}

const slackBody = {
  channel: '#budget',
  username: 'AxKz-Budget-Bot',
  blocks: [],
  // icon_emoji: ':ghost:'
};

const convertBudgetRemainingToSlackBlocks = (monthlyBudget, month) => {
  const budgetCategories = Object.keys(monthlyBudget);
  const categorySections = budgetCategories.map(categoryName => {
    const budgetCategory = monthlyBudget[categoryName];
    const expected = budgetCategory.e;
    const actual = budgetCategory.a;
    const difference = expected - actual;
    const isOverBudget = difference < 0;
    return {
      "type": "section",
      "text": {
        "type": "plain_text",
        "emoji": true,
        "text": `${isOverBudget ? slackNegativeEmoji : slackPositiveEmoji } `+
                `$${Math.abs(difference)} ${isOverBudget ? "over" : "remaining"} in ${categoryName}`
      }
    };
  });
  const now = new Date();
  return [
    {
      "type": "section",
      "text": {
        "type": "mrkdwn",
        "text": `Here is a budget breakdown for ${month || 'this month'} as of *${now.toUTCString()}*`
      }
    },
    {
      "type": "divider"
    },
    ...categorySections
  ]
}

module.exports.slackReadBudget = async event => {
  try{
    if(!slackURL) return {statusCode: 500, body: "No Slack URL provided for incoming webhooks"};
    if(!event.month) return {statusCode: 400, body: "Missing Input Param: month"};  // TODO: assume current month if none provided
    // TODO: support year in DDB as well?
    const monthlyBudgetEntry = await ddbGetItem({
      TableName: "SlackBudget",
      Key: {"pk": "april"},
     });
     const monthlyBudget = monthlyBudgetEntry.budget;
     console.log(JSON.stringify(monthlyBudget));
     const slackBlocks = convertBudgetRemainingToSlackBlocks(monthlyBudget);
     await axios.post(slackURL, {...slackBody, blocks: slackBlocks}); 
     return {
       statusCode: 200,
       body: JSON.stringify(monthlyBudgetEntry),
       budget: monthlyBudget
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
