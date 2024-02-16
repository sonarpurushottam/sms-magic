// tests/company.test.js
const request = require('supertest');
const app = require('../server'); // Adjust the path based on your project structure

describe('Company Tests', () => {
  test('There is only 1 company with more than 200000 employees', async () => {
    const response = await request(app).get('/companies/200000/Infinity');
    expect(response.status).toBe(200);
    expect(response.body.length).toBe(1);
    // Add more assertions as needed based on your data and requirements
  });
});
