const awsConfig = {
  Auth: {
    Cognito: {
      userPoolId: process.env.NEXT_PUBLIC_AWS_USER_POOLS_ID || 'eu-north-1_MVwkbI87K',
      userPoolClientId: process.env.NEXT_PUBLIC_AWS_USER_POOLS_WEB_CLIENT_ID || '18b21rcmp9f1sl3q7v0pcrircf',
      region: process.env.NEXT_PUBLIC_AWS_COGNITO_REGION || 'eu-north-1',
    }
  }
};

export default awsConfig;