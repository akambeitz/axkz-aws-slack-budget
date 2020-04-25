'use strict';
const AWS = require('aws-sdk');
const DDB = new AWS.DynamoDB.DocumentClient();

AWS.config.update({region: 'us-east-2'});

const ddbGetItem = (ddbParam) => {
  return DDB.get(ddbParam).promise().then(response => response.Item);
}

module.exports.slackReadBudget = async event => {
  try{
    if(!event.month) return {statusCode: 400, body: "Missing Input Param: month"};
    const monthlyBudgetEntry = await ddbGetItem({
      TableName: "SlackBudget",
      Key: {"pk": "may"},
     });
     const monthlyBudget = monthlyBudgetEntry.budget;
     console.log(JSON.stringify(monthlyBudget));
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
