'use client';
/* eslint-disable */
// @ts-nocheck

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Box, 
  Container, 
  Typography, 
  Button, 
  Grid,
  Card,
  TextField,
  InputAdornment,
  IconButton,
  useTheme,
  Stack,
  Checkbox,
  FormControlLabel,
  Alert
} from '@mui/material';
import { 
  IconEye, 
  IconEyeOff,
  IconMail,
  IconLock,
  IconLogin
} from '@tabler/icons-react';
import { Formik } from 'formik';
import * as Yup from 'yup';

// AWS Amplify
import { signIn, confirmSignIn, signOut } from 'aws-amplify/auth';

// Custom hook for token management
import { useAuthTokens } from '../../src/hooks/useAuthTokens';

// Project imports (usando componenti Berry) - temporaneamente disabilitati
// import MainCard from '../../src/ui-component/cards/MainCard';
// import AnimateButton from '../../src/ui-component/extended/AnimateButton';

export default function LoginPage() {
  const theme = useTheme();
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [signInSession, setSignInSession] = useState<any>(null);
  const [isClient, setIsClient] = useState(false);
  
  // 🔐 Hook per gestione token Cognito
  const { checkAuthState, getAuthHeaders, isAuthenticated } = useAuthTokens();

  // 🔧 Fix hydration mismatch
  useEffect(() => {
    setIsClient(true);
  }, []);

  const handleClickShowPassword = () => {
    setShowPassword(!showPassword);
  };

  const loginSchema = Yup.object().shape({
    email: Yup.string().email('Email non valida').required('Email richiesta'),
    password: Yup.string().min(1, 'Password richiesta').required('Password richiesta'),
    newPassword: isChangingPassword ? Yup.string().min(8, 'Minimo 8 caratteri').required('Nuova password richiesta') : Yup.string()
  });

  // @ts-ignore
  const handleSubmit = async (values, { setSubmitting, setFieldError }) => {
    try {
      setSubmitting(true);
      
      console.log('🔐 Login attempt:', values.email);
      
      if (isChangingPassword && signInSession) {
        // Conferma il cambio password
        console.log('🔄 Confirming new password');
        const { isSignedIn } = await confirmSignIn({
          challengeResponse: values.newPassword
        });
        
        if (isSignedIn) {
          console.log('✅ Password changed successfully');
          // 🔑 Aggiorna token dopo cambio password
          await checkAuthState();
          router.push('/dashboard');
        } else {
          setFieldError('submit', 'Errore nel cambio password. Riprova.');
        }
        return;
      }
      
      // Login con AWS Cognito
      let loginResult;
      try {
        loginResult = await signIn({
          username: values.email,
          password: values.password,
        });
      } catch (signInError: any) {
        if (signInError.name === 'UserAlreadyAuthenticatedException') {
          console.log('🔄 User already authenticated, signing out first...');
          try {
            await signOut();
            // Pulisci anche i token locali
            localStorage.clear();
            console.log('✅ Logout completed, retrying login...');
            
            // Retry login after logout
            loginResult = await signIn({
              username: values.email,
              password: values.password,
            });
          } catch (logoutError) {
            console.error('❌ Logout failed:', logoutError);
            setFieldError('submit', 'Errore durante il logout. Ricarica la pagina e riprova.');
            return;
          }
        } else {
          throw signInError; // Re-throw other errors
        }
      }
      
      const { isSignedIn, nextStep } = loginResult;

      console.log('🔐 Login response:', { isSignedIn, nextStep });

      if (isSignedIn) {
        console.log('✅ Login successful');
        // 🔑 Ottieni e salva token Cognito
        await checkAuthState();
        router.push('/dashboard');
      } else if (nextStep.signInStep === 'CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED') {
        console.log('🔄 Password change required');
        setSignInSession(nextStep);
        setIsChangingPassword(true);
        setFieldError('submit', 'Inserisci la nuova password (minimo 8 caratteri)');
      } else {
        console.log('❌ Login failed - next step:', nextStep);
        setFieldError('submit', 'Autenticazione non completata. Riprova.');
      }
      
    } catch (error: any) {
      console.error('❌ Login error:', error);
      
      // Gestione errori specifici di Cognito
      let errorMessage = 'Errore durante l\'autenticazione. Riprova.';
      if (error.name === 'NotAuthorizedException') {
        errorMessage = 'Credenziali non valide. Verifica email e password.';
      } else if (error.name === 'UserNotConfirmedException') {
        errorMessage = 'Account non confermato. Controlla la tua email.';
      } else if (error.name === 'UserNotFoundException') {
        errorMessage = 'Utente non trovato. Verifica l\'email inserita.';
      } else if (error.name === 'TooManyRequestsException') {
        errorMessage = 'Troppi tentativi. Riprova tra qualche minuto.';
      }
      
      setFieldError('submit', errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  // 🔧 Evita rendering durante SSR per evitare hydration mismatch
  if (!isClient) {
    return (
      <Box sx={{ 
        minHeight: '100vh',
        bgcolor: 'grey.50',
        display: 'flex',
        alignItems: 'center',
        py: 4
      }}>
        <Container maxWidth="xl">
        <Grid container justifyContent="center">
        <Grid component="div" item xs={12} sm={11} md={10} lg={8}>
              <Card elevation={8} sx={{ borderRadius: 3, overflow: 'hidden' }}>
                <Box sx={{ p: { xs: 2, md: 4 } }}>
                  <Typography variant="h4" sx={{ textAlign: 'center', mb: 4 }}>
                    Caricamento...
                  </Typography>
                </Box>
              </Card>
            </Grid>
          </Grid>
        </Container>
      </Box>
    );
  }

  return (
      <Box sx={{ 
      minHeight: '100vh',
      bgcolor: 'grey.50',
      display: 'flex',
      alignItems: 'center',
      py: 4
    }}>
      <Container maxWidth="xl">
        <Grid container justifyContent="center">
          {/* @ts-ignore */}
          <Grid item xs={12} sm={11} md={10} lg={8}>
            <Card 
              elevation={8}
              sx={{ 
                borderRadius: 3,
                overflow: 'hidden'
              }}
            >
              <Box sx={{ p: { xs: 2, md: 4 } }}>
                                {/* Header */}
                <Box sx={{ textAlign: 'center', mb: 5 }}>
                  <Typography 
                    variant="h3" 
                    fontWeight={800} 
                    color="text.primary"
                    gutterBottom
                  >
                    MioSaaS
                  </Typography>
                  <Typography variant="h6" color="text.secondary">
                    Accedi alla piattaforma
                  </Typography>
                </Box>

                {/* Form */}
                <Formik
                  initialValues={{
                    email: '',
                    password: '',
                    newPassword: '',
                    remember: false,
                    submit: null
                  }}
                  validationSchema={loginSchema}
                  onSubmit={handleSubmit}
                >
                  {({ errors, handleBlur, handleChange, handleSubmit, isSubmitting, touched, values }) => (
                    <form noValidate onSubmit={handleSubmit}>
                      <Stack spacing={4}>
                        {/* Email Field */}
                        <TextField
                          fullWidth
                          label="Indirizzo Email"
                          type="email"
                          name="email"
                          value={values.email}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          error={Boolean(touched.email && errors.email)}
                          helperText={touched.email && errors.email}
                          placeholder="Inserisci la tua email"
                          InputProps={{
                            startAdornment: (
                              <InputAdornment position="start">
                                <IconMail size={22} color={theme.palette.text.secondary} />
                              </InputAdornment>
                            )
                          }}
                          sx={{
                            '& .MuiOutlinedInput-root': {
                              borderRadius: 2,
                              py: 0.5
                            }
                          }}
                        />

                        {/* Password Field */}
                        <TextField
                          fullWidth
                          label="Password"
                          type={showPassword ? 'text' : 'password'}
                          name="password"
                          value={values.password}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          error={Boolean(touched.password && errors.password)}
                          helperText={touched.password && errors.password}
                          InputProps={{
                            startAdornment: (
                              <InputAdornment position="start">
                                <IconLock size={22} color={theme.palette.text.secondary} />
                              </InputAdornment>
                            ),
                            endAdornment: (
                              <InputAdornment position="end">
                                <IconButton 
                                  onClick={handleClickShowPassword} 
                                  edge="end"
                                  sx={{ mr: 1 }}
                                >
                                  {showPassword ? 
                                    <IconEyeOff size={20} color={theme.palette.text.secondary} /> : 
                                    <IconEye size={20} color={theme.palette.text.secondary} />
                                  }
                                </IconButton>
                              </InputAdornment>
                            )
                          }}
                    sx={{ 
                            '& .MuiOutlinedInput-root': {
                      borderRadius: 2,
                              py: 0.5
                            }
                          }}
                        />

                        {/* New Password Field (sempre presente ma nascosto quando non necessario) */}
                        <TextField
                          fullWidth
                          label="Nuova Password"
                          type={showPassword ? 'text' : 'password'}
                          name="newPassword"
                          value={values.newPassword}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          error={Boolean(touched.newPassword && errors.newPassword)}
                          helperText={touched.newPassword && errors.newPassword}
                          placeholder="Inserisci la nuova password (minimo 8 caratteri)"
                          InputProps={{
                            startAdornment: (
                              <InputAdornment position="start">
                                <IconLock size={22} color={theme.palette.text.secondary} />
                              </InputAdornment>
                            ),
                            endAdornment: (
                              <InputAdornment position="end">
                                <IconButton 
                                  onClick={handleClickShowPassword} 
                                  edge="end"
                                  sx={{ mr: 1 }}
                                >
                                  {showPassword ? 
                                    <IconEyeOff size={20} color={theme.palette.text.secondary} /> : 
                                    <IconEye size={20} color={theme.palette.text.secondary} />
                                  }
                                </IconButton>
                              </InputAdornment>
                            )
                          }}
                          sx={{ 
                            display: isChangingPassword ? 'block' : 'none',
                            '& .MuiOutlinedInput-root': {
                              borderRadius: 2,
                              py: 0.5
                            }
                          }}
                        />

                        {/* Remember & Forgot */}
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                          <FormControlLabel
                            control={
                              <Checkbox 
                                name="remember"
                                checked={values.remember}
                                onChange={handleChange}
                                color="primary"
                                size="small"
                              />
                            }
                            label={
                              <Typography variant="body2" color="text.secondary">
                                Ricordami
                              </Typography>
                            }
                          />
                  <Button
                            variant="text" 
                            size="small"
                    sx={{ 
                      textTransform: 'none',
                              fontWeight: 500,
                              color: 'primary.main'
                    }}
                  >
                            Password dimenticata?
                  </Button>
                </Stack>

                        {/* Error Message */}
                        {errors.submit && (
                          <Alert 
                            severity="error" 
                            sx={{ 
                              borderRadius: 2,
                              '& .MuiAlert-message': {
                                fontWeight: 500
                              }
                            }}
                          >
                            {errors.submit}
                          </Alert>
                        )}

                        {/* Submit Button */}
                        <Button
                          disableElevation
                          disabled={isSubmitting}
                          fullWidth
                          size="large"
                          type="submit"
                          variant="contained"
                          startIcon={<IconLogin />}
                  sx={{ 
                            py: 1.8,
                            borderRadius: 2,
                            fontWeight: 600,
                            fontSize: '1.1rem',
                            textTransform: 'none',
                            bgcolor: 'primary.main',
                            '&:hover': {
                              bgcolor: 'primary.dark',
                            },
                            '&:disabled': {
                              bgcolor: 'grey.300'
                            }
                          }}
                        >
                          {isSubmitting ? 'Accesso in corso...' : 'Accedi alla Dashboard'}
                        </Button>

                    </Stack>
                    </form>
                  )}
                </Formik>
              </Box>
            </Card>

            {/* 🚨 Emergency Logout Button */}
            <Box sx={{ textAlign: 'center', mt: 2, mb: 2 }}>
              <Button
                variant="outlined"
                size="small"
                color="warning"
                onClick={async () => {
                  try {
                    console.log('🔄 Force logout...');
                    await signOut();
                    localStorage.clear();
                    sessionStorage.clear();
                    console.log('✅ Force logout completed');
                    window.location.reload();
                  } catch (error) {
                    console.error('❌ Force logout error:', error);
                    localStorage.clear();
                    sessionStorage.clear();
                    window.location.reload();
                  }
                }}
                sx={{ 
                  textTransform: 'none',
                  fontSize: '0.8rem',
                  px: 2,
                  py: 0.5
                }}
              >
                🚨 Forza Logout (Se problemi di login)
              </Button>
            </Box>

            {/* Footer */}
            <Box sx={{ textAlign: 'center', mt: 2 }}>
              <Typography variant="body2" color="text.secondary">
                © 2024 MioSaaS - Piattaforma SaaS professionale
                </Typography>
            </Box>
          </Grid>
        </Grid>
        </Container>
      </Box>
  );
}