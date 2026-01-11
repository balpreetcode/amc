import { test, expect } from '@playwright/test';

test.describe('Workflow Execution Tests', () => {
  const BACKEND_URL = 'http://localhost:3002';
  const TEST_WORKFLOW = {
    nodes: [
      {
        id: 'node1',
        type: 'text_to_text',
        config: {
          prompt: 'Write a short story about a robot',
          model: 'gpt-4o-mini'
        }
      }
    ],
    workflowName: 'Test Workflow'
  };

  test('should check backend health', async ({ request }) => {
    const response = await request.get(`${BACKEND_URL}/health`);

    console.log('Health check status:', response.status());
    console.log('Health check response:', await response.json());

    expect(response.status()).toBe(200);
  });

  test('should execute workflow without 401 error', async ({ request }) => {
    // Start the workflow
    const startResponse = await request.post(`${BACKEND_URL}/workflow/run`, {
      data: TEST_WORKFLOW
    });

    console.log('Workflow start status:', startResponse.status());

    if (startResponse.status() === 401) {
      console.error('❌ Got 401 Unauthorized error when starting workflow');
      console.error('Response:', await startResponse.text());
    }

    expect(startResponse.status()).not.toBe(401);
    expect([200, 201]).toContain(startResponse.status());

    const startData = await startResponse.json();
    console.log('Workflow started:', startData);

    expect(startData.workflowId).toBeDefined();

    // Check workflow status
    const workflowId = startData.workflowId;
    const statusResponse = await request.get(`${BACKEND_URL}/workflow/${workflowId}/status`);

    console.log('Status check status:', statusResponse.status());

    if (statusResponse.status() === 401) {
      console.error('❌ Got 401 Unauthorized error when checking status');
      console.error('Response:', await statusResponse.text());
    }

    expect(statusResponse.status()).not.toBe(401);
    expect(statusResponse.status()).toBe(200);

    const statusData = await statusResponse.json();
    console.log('Workflow status:', statusData);
  });

  test('should check conductor connectivity', async ({ request }) => {
    const CONDUCTOR_URL = process.env.CONDUCTOR_URL || 'https://p5300.winds-os.com/api';

    try {
      const response = await request.get(`${CONDUCTOR_URL}/health`, {
        timeout: 10000
      });

      console.log('Conductor health check status:', response.status());

      if (response.status() === 401) {
        console.error('❌ Got 401 Unauthorized error from Conductor');
        console.error('Conductor URL:', CONDUCTOR_URL);
        console.error('Response:', await response.text());
      } else {
        console.log('✅ Conductor is accessible');
        console.log('Response:', await response.text());
      }
    } catch (error) {
      console.error('❌ Failed to connect to Conductor:', error);
    }
  });

  test('should test workflow history endpoint', async ({ request }) => {
    const response = await request.get(`${BACKEND_URL}/workflow/history`);

    console.log('History endpoint status:', response.status());

    if (response.status() === 401) {
      console.error('❌ Got 401 Unauthorized error on history endpoint');
    }

    expect(response.status()).not.toBe(401);
    expect(response.status()).toBe(200);
  });
});
