export const GENERAL_EXCHANGE_NAME = 'taskfusion';

export const DL_EXCHANGE_NAME = 'deadletter';

export const USERS_QUEUE_NAME = `${GENERAL_EXCHANGE_NAME}.users`;

export const PROJECTS_QUEUE_NAME = `${GENERAL_EXCHANGE_NAME}.users`;

export const DL_QUEUE_NAME = `${DL_EXCHANGE_NAME}.messages`;

export const USERS_QUEUE_ROUTING_KEYS = `${USERS_QUEUE_NAME}.*`;

export const DL_QUEUE_ROUTING_KEYS = `${DL_QUEUE_NAME}.*`;

export const DL_UNIVERSAL_ROUTING_KEY = `${DL_QUEUE_NAME}.universal`;
