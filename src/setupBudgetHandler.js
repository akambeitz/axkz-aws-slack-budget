'use strict';
const AWS = require('aws-sdk');
AWS.config.update({region: 'us-east-2'});
const DDB = new AWS.DynamoDB.DocumentClient();

const budgetTemplate = [
    { 'fun-alex': 30 },
    { 'car-gas': 100 },
    { 'car-insurance': 140 },
    { 'car-license': 4 },
    { 'car-service': 75 },
    { 'car-payment': 0 },
    { 'giving-church': 125 },
    { 'giving-cru': 535 },
    { 'fun-entertainment': 50 },
    { 'fun-erica': 30 },
    { 'fitness': 0 },
    { 'gifts': 100 },
    { 'groceries': 480 },
    { 'home-electric': 90 },
    { 'home-gas': 30 },
    { 'home-rent': 1264 },
    { 'home-rent-insurance': 10 },
    { 'home-wifi': 45 },
    { 'home-househod': 75 },
    { 'fun-kambeitz': 200 },
    { 'restaurant': 100 },
    { 'misc': 50 },
    { 'personal-care': 75 },
    { 'fun-projects': 100 }
  ];

const setupBudget = async () => {
    const budgetMonthPutPromises = budgetTemplate.map(category => {
        const budgetItem = {
            category: Object.keys(category)[0],
            allowance: category[Object.keys(category)[0]],
            expenses: [],
            timeframe: '20-07'
        };
        const params = {
            TableName: "budget",
            Item: budgetItem
        };
        return DDB.put(params).promise();
    });
    await Promise.all(budgetMonthPutPromises);
    return 200;
};

module.exports = {
    setupBudget
}
// setupBudget().then(x => console.log(x)).catch(x => console.log(x));