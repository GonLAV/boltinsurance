import React from 'react';
import ReactDOMServer from 'react-dom/server';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import CreateTestCasePage from '../CreateTestCasePage';
import EditTestCasePage from '../EditTestCasePage';

jest.mock('react-toastify', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
  },
}));

jest.mock('../../testCase.api', () => ({
  testCaseApi: {
    getTestCaseById: jest.fn(async () => ({
      data: {
        success: true,
        data: {
          testCase: {
            id: 123,
            title: 'Example test case',
            description: 'Desc',
            steps: [],
          },
        },
      },
    })),
    createTestCase: jest.fn(async () => ({ data: { success: true } })),
  },
}));

describe('Test case pages snapshot', () => {
  it('CreateTestCasePage includes compact density wrapper', () => {
    const html = ReactDOMServer.renderToStaticMarkup(
      <MemoryRouter
        initialEntries={[{ pathname: '/create', state: { userStoryId: 1, userStoryTitle: 'US' } } as any]}
      >
        <Routes>
          <Route path="/create" element={<CreateTestCasePage />} />
        </Routes>
      </MemoryRouter>
    );

    expect(html).toContain('tc-density-compact');
    expect(html).toMatchSnapshot();
  });

  it('EditTestCasePage includes compact density wrapper', async () => {
    const html = ReactDOMServer.renderToStaticMarkup(
      <MemoryRouter initialEntries={['/edit/123']}>
        <Routes>
          <Route path="/edit/:testCaseId" element={<EditTestCasePage />} />
        </Routes>
      </MemoryRouter>
    );

    expect(html).toContain('tc-density-compact');
    expect(html).toMatchSnapshot();
  });
});
