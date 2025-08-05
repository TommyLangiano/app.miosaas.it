const awsConfig = {
  aws_project_region: process.env.NEXT_PUBLIC_AWS_PROJECT_REGION || 'eu-north-1',
  aws_cognito_region: process.env.NEXT_PUBLIC_AWS_COGNITO_REGION || 'eu-north-1',
  aws_user_pools_id: process.env.NEXT_PUBLIC_AWS_USER_POOLS_ID || 'eu-north-1_MVwkbI87K',
  aws_user_pools_web_client_id: process.env.NEXT_PUBLIC_AWS_USER_POOLS_WEB_CLIENT_ID || '18b21rcmp9f1sl3q7v0pcrircf',
  Auth: {
    region: process.env.NEXT_PUBLIC_AWS_COGNITO_REGION || 'eu-north-1',
    userPoolId: process.env.NEXT_PUBLIC_AWS_USER_POOLS_ID || 'eu-north-1_MVwkbI87K',
    userPoolWebClientId: process.env.NEXT_PUBLIC_AWS_USER_POOLS_WEB_CLIENT_ID || '18b21rcmp9f1sl3q7v0pcrircf',
  }
};

export default awsConfig;