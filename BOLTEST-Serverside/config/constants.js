module.exports = {
    // Azure DevOps API Version
    AZURE_API_VERSION: '5.0',

    // Work Item Types
    WORK_ITEM_TYPES: {
        TEST_CASE: 'Test Case',
        BUG: 'Bug',
        TASK: 'Task',
        USER_STORY: 'User Story',
        SHARED_PARAMETER: 'Shared Parameter'
    },

    // Test Case States
    TEST_CASE_STATES: {
        DESIGN: 'Design',
        READY: 'Ready',
        CLOSED: 'Closed'
    },

    // HTTP Status Codes
    HTTP_STATUS: {
        OK: 200,
        CREATED: 201,
        BAD_REQUEST: 400,
        UNAUTHORIZED: 401,
        FORBIDDEN: 403,
        NOT_FOUND: 404,
        INTERNAL_SERVER_ERROR: 500
    },

    // Token Expiration (shorter for encrypted tokens)
    TOKEN_EXPIRATION: '1h',

    // Rate Limiting
    RATE_LIMIT: {
        WINDOW_MS: 15 * 60 * 1000, // 15 minutes
        MAX_REQUESTS: 100
    }
};