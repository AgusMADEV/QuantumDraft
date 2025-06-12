// Mock para Chart.js
module.exports = {
  Chart: jest.fn().mockImplementation(() => {
    return {
      update: jest.fn(),
      destroy: jest.fn(),
      data: {
        labels: [],
        datasets: [{
          data: []
        }]
      }
    };
  })
};