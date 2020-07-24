'use strict';

module.exports.currentTimeframe = () => {
    const currentDate = new Date();
    const timeframeYear = currentDate.getFullYear().toString().slice(-2);
    const timeframeMonth = (currentDate.getMonth() + 1).toString().padStart('2',0);
    return `${timeframeYear}-${timeframeMonth}`;
}