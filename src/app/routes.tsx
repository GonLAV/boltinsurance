import React from 'react';
import Layout from '../shared/components/layout/Layout';
const LoginPage = React.lazy(() => import('../features/auth/components/LoginPage'));
const DashboardView = React.lazy(() => import('../features/dashboard/components/DashboardView'));
const UserStoriesView = React.lazy(() => import('../features/stories/components/UserStoriesView'));
const TeamTestsView = React.lazy(() => import('../features/teamTests/components/TeamTestsView'));
const CreateTestCasePage = React.lazy(() => import('../features/testCases/components/CreateTestCasePage'));
const EditTestCasePage = React.lazy(() => import('../features/testCases/components/EditTestCasePage'));
const CreateWorkItemPage = React.lazy(() => import('../features/workItems/components/CreateWorkItemPage'));
const TestPlansPage = React.lazy(() => import('../features/testPlans/components/TestPlansPage'));
const GETitView = React.lazy(() => import('../features/apiRunner/GETitView'));
const SharedParametersView = React.lazy(() => import('../features/sharedParameters/SharedParametersView'));

export type AppRoute = {
  path: string;
  element: React.ReactNode;
  children?: AppRoute[];
};

export const routes: AppRoute[] = [
  { path: '/', element: <LoginPage /> },
  {
    path: '/app/*',
    element: <Layout />,
    children: [
      { path: 'dashboard', element: <DashboardView /> },
      { path: 'user-stories', element: <UserStoriesView /> },
      { path: 'team-tests', element: <TeamTestsView /> },
      { path: 'create', element: <CreateTestCasePage /> },
      { path: 'edit-test/:testCaseId', element: <EditTestCasePage /> },
      { path: 'work-item', element: <CreateWorkItemPage /> },
      { path: 'test-plans', element: <TestPlansPage /> },
      { path: 'api', element: <GETitView /> },
      { path: 'shared-parameters', element: <SharedParametersView /> }
    ]
  }
];
