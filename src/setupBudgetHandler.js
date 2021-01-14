'use strict';
const AWS = require('aws-sdk');
AWS.config.update({region: 'us-east-2'});
const DDB = new AWS.DynamoDB.DocumentClient();

const budgetTemplate = [
    { 'phones': 150 },
    { 'fun-alex': 30 },
    { 'car-gas': 100 },
    { 'car-insurance': 140 },
    { 'car-license': 4 },
    { 'car-service': 75 },
    { 'car-payment': 0 },
    { 'giving-church': 150 },
    { 'giving-cru': 535 },
    { 'fun-entertainment': 50 },
    { 'fun-erica': 30 },
    { 'fitness': 0 },
    { 'gifts': 50 },
    { 'groceries': 450 },
    { 'home-electric': 90 },
    { 'home-gas': 30 },
    { 'home-rent': 1289 },
    { 'home-rent-insurance': 10 },
    { 'home-wifi': 60 },
    { 'home-household': 50 },
    { 'fun-kambeitz': 100 },
    { 'restaurant': 150 },
    { 'misc': 50 },
    { 'personal-care': 50 },
    { 'fun-projects': 50 }
  ];

// TODO: stand up new lambda to run this operation each month.
// TODO: move above JSON into Dynamo config table for easier access to edit and create new month's budget (UI component)
const setupBudget = async () => {
    const budgetMonthPutPromises = budgetTemplate.map(category => {
        const budgetItem = {
            category: Object.keys(category)[0],
            allowance: category[Object.keys(category)[0]],
            expenses: [],
            timeframe: '21-01'
        };
        const params = {
            TableName: "budget",
            Item: budgetItem
        };
        return DDB.put(params).promise();
    });
    await Promise.all(budgetMonthPutPromises);
    return {statusCode: 200};
};

let budgetSum = 0;
budgetTemplate.forEach(budgetItem => {
    const budgetKey = Object.keys(budgetItem)[0];
    budgetSum = budgetSum + budgetItem[budgetKey];
});
console.log(budgetSum);
setupBudget().then(x => console.log(x)).catch(x => console.log(x));