const {reportBudget} = require('./src/reportBudgetHandler');

reportBudget({}).then(x => console.log(x)).catch(x => console.log(x));