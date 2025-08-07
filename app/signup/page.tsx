'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Typography,
  Card,
  Stack,
  Button,
  TextField,
  FormControl,
  Select,
  MenuItem,
  InputLabel,
  Stepper,
  Step,
  StepLabel,
  Avatar,
  Chip,
  Alert,
  CircularProgress,
  useTheme,
  Container,
  Grid,
  Divider
} from '@mui/material';

import {
  IconCheck,
  IconCrown,
  IconUsers,
  IconBuilding,
  IconMail,
  IconLock,
  IconArrowRight,
  IconArrowLeft,
  IconRocket,
  IconDevices,
  IconChartBar,
  IconShield,
  IconHeadphones
} from '@tabler/icons-react';

interface FormData {
  email: string;
  password: string;
  confirm_password: string;
  name: string;
  surname: string;
  company_name: string;
  company_size: string;
  country: string;
  selected_plan: string;
}

interface RegistrationResponse {
  success: boolean;
  message: string;
  company_id?: string;
  user_id?: string;
  error?: string;
}

const plans = [
  {
    id: 'starter',
    name: 'Starter',
    price: '€29/mese',
    description: 'Perfetto per piccole aziende',
    features: [
      'Fino a 5 utenti',
      'Gestione documenti illimitata',
      'Rapportini base',
      'Support email'
    ],
    color: 'primary' as const,
    icon: IconUsers
  },
  {
    id: 'professional',
    name: 'Professional',
    price: '€79/mese',
    description: 'Per aziende in crescita',
    features: [
      'Fino a 25 utenti',
      'Gestione documenti avanzata',
      'Rapportini completi + Analytics',
      'Commesse illimitate',
      'Support prioritario'
    ],
    popular: true,
    color: 'success' as const,
    icon: IconChartBar
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: '€199/mese',
    description: 'Per grandi organizzazioni',
    features: [
      'Utenti illimitati',
      'Tutte le funzionalità',
      'API personalizzate',
      'Support dedicato 24/7',
      'Onboarding personalizzato'
    ],
    color: 'warning' as const,
    icon: IconShield
  }
];

const steps = ['Scegli Piano', 'Dati Personali', 'Dati Azienda'];

const SignupPage = () => {
  const theme = useTheme();
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<FormData>({
    email: '',
    password: '',
    confirm_password: '',
    name: '',
    surname: '',
    company_name: '',
    company_size: 'small',
    country: 'IT',
    selected_plan: 'professional'
  });

  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<RegistrationResponse | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [slugPreview, setSlugPreview] = useState('');

  const validateStep = (step: number) => {
    const newErrors: Record<string, string> = {};
    
    if (step === 0) {
      if (!formData.selected_plan) newErrors.selected_plan = 'Seleziona un piano';
    }
    
    if (step === 1) {
      if (!formData.email) newErrors.email = 'Email è obbligatoria';
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) newErrors.email = 'Email non valida';
      if (!formData.password) newErrors.password = 'Password è obbligatoria';
      else if (formData.password.length < 8) newErrors.password = 'Password deve essere di almeno 8 caratteri';
      if (formData.password !== formData.confirm_password) newErrors.confirm_password = 'Le password non coincidono';
      if (!formData.name) newErrors.name = 'Nome è obbligatorio';
      if (!formData.surname) newErrors.surname = 'Cognome è obbligatorio';
    }
    
    if (step === 2) {
      if (!formData.company_name) newErrors.company_name = 'Nome azienda è obbligatorio';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
    
    if (name === 'company_name') {
      const generatedSlug = value
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .replace(/\s+/g, '_')
        .substring(0, 20);
      setSlugPreview(generatedSlug);
    }
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => prev - 1);
  };

  const handleSubmit = async () => {
    if (!validateStep(2)) return;

    setLoading(true);
    setResponse(null);

    try {
      const submitData = {
        email: formData.email,
        password: formData.password,
        name: formData.name,
        surname: formData.surname,
        company_name: formData.company_name,
        company_size: formData.company_size,
        country: formData.country,
      };

      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submitData),
      });

      const data: RegistrationResponse = await res.json();
      setResponse(data);

      if (data.success) {
        setCurrentStep(3);
      }

    } catch (err) {
      console.error('Errore durante la registrazione:', err);
      setResponse({
        success: false,
        message: 'Errore di rete durante la registrazione',
        error: err instanceof Error ? err.message : 'Errore sconosciuto',
      });
    } finally {
      setLoading(false);
    }
  };

  const selectedPlan = plans.find(p => p.id === formData.selected_plan);

  // Success Page
  if (currentStep === 3 && response?.success) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: 'grey.100', display: 'flex', alignItems: 'center', justifyContent: 'center', p: 3 }}>
        <Card sx={{ maxWidth: 500, width: '100%', p: 4, textAlign: 'center' }}>
          <Avatar
            sx={{
              bgcolor: 'success.main',
              width: 80,
              height: 80,
              mx: 'auto',
              mb: 3,
              fontSize: '2rem'
            }}
          >
            🎉
          </Avatar>
          
          <Typography variant="h4" gutterBottom sx={{ fontWeight: 700, color: 'success.main' }}>
            Registrazione Completata!
          </Typography>
          
          <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
            {response.message}
          </Typography>
          
          <Card variant="outlined" sx={{ p: 3, mb: 4, textAlign: 'left', bgcolor: 'grey.50' }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              <strong>ID Azienda:</strong>
            </Typography>
            <Typography variant="caption" sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>
              {response.company_id}
            </Typography>
            
            <Typography variant="body2" color="text.secondary" gutterBottom sx={{ mt: 2 }}>
              <strong>ID Utente:</strong>
            </Typography>
            <Typography variant="caption" sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>
              {response.user_id}
            </Typography>
          </Card>
          
          <Stack spacing={2}>
            <Button
              variant="contained"
              size="large"
              startIcon={<IconRocket />}
              onClick={() => router.push('/dashboard')}
              sx={{
                py: 2,
                background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`
              }}
            >
              Accedi alla Dashboard
            </Button>
            <Button
              variant="outlined"
              size="large"
              onClick={() => router.push('/')}
              sx={{ py: 2 }}
            >
              Torna alla Home
            </Button>
          </Stack>
        </Card>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'grey.100', display: 'flex', alignItems: 'center', justifyContent: 'center', p: 3 }}>
      <Container maxWidth="lg">
        <Card sx={{ width: '100%', overflow: 'hidden' }}>
          {/* Header */}
          <Box sx={{ p: 4, bgcolor: 'background.paper', borderBottom: 1, borderColor: 'divider' }}>
            <Typography variant="h3" gutterBottom sx={{ fontWeight: 700 }}>
              Inizia con MioSaaS
            </Typography>
            <Typography variant="h6" color="text.secondary" sx={{ mb: 4 }}>
              La piattaforma all-in-one per la gestione della tua azienda
            </Typography>
            
            {/* Stepper */}
            <Stepper activeStep={currentStep} sx={{ mb: 2 }}>
              {steps.map((label) => (
                <Step key={label}>
                  <StepLabel>{label}</StepLabel>
                </Step>
              ))}
            </Stepper>
          </Box>

          <Box sx={{ p: 4 }}>
            {/* Step 1: Piano Selection */}
            {currentStep === 0 && (
              <Box>
                <Typography variant="h4" gutterBottom sx={{ fontWeight: 700, mb: 4 }}>
                  Scegli il Piano Perfetto per Te
                </Typography>
                
                <Grid container spacing={3}>
                  {plans.map((plan) => {
                    const IconComponent = plan.icon;
                    return (
                      <Grid size={{ xs: 12, md: 4 }} key={plan.id}>
                        <Card
                          variant={formData.selected_plan === plan.id ? "elevation" : "outlined"}
                          sx={{
                            height: '100%',
                            cursor: 'pointer',
                            position: 'relative',
                            transition: 'all 0.3s',
                            transform: formData.selected_plan === plan.id ? 'translateY(-8px)' : 'none',
                            border: formData.selected_plan === plan.id ? 2 : 1,
                            borderColor: formData.selected_plan === plan.id ? `${plan.color}.main` : 'divider',
                            '&:hover': {
                              transform: 'translateY(-4px)',
                              boxShadow: theme.shadows[8]
                            }
                          }}
                          onClick={() => setFormData(prev => ({ ...prev, selected_plan: plan.id }))}
                        >
                          {plan.popular && (
                            <Chip
                              label="Più Popolare"
                              color="success"
                              size="small"
                              sx={{
                                position: 'absolute',
                                top: 16,
                                right: 16,
                                zIndex: 1
                              }}
                            />
                          )}
                          
                          <Box sx={{ p: 3, textAlign: 'center' }}>
                            <Avatar
                              sx={{
                                bgcolor: `${plan.color}.main`,
                                width: 56,
                                height: 56,
                                mx: 'auto',
                                mb: 2
                              }}
                            >
                              <IconComponent size={24} />
                            </Avatar>
                            
                            <Typography variant="h5" gutterBottom sx={{ fontWeight: 700 }}>
                              {plan.name}
                            </Typography>
                            
                            <Typography variant="h4" color={`${plan.color}.main`} sx={{ fontWeight: 700, mb: 1 }}>
                              {plan.price}
                            </Typography>
                            
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                              {plan.description}
                            </Typography>
                            
                            <Stack spacing={1} sx={{ textAlign: 'left' }}>
                              {plan.features.map((feature, index) => (
                                <Stack direction="row" alignItems="center" spacing={1} key={index}>
                                  <IconCheck size={16} color={theme.palette.success.main} />
                                  <Typography variant="body2" color="text.secondary">
                                    {feature}
                                  </Typography>
                                </Stack>
                              ))}
                            </Stack>
                          </Box>
                        </Card>
                      </Grid>
                    );
                  })}
                </Grid>
                
                {errors.selected_plan && (
                  <Alert severity="error" sx={{ mt: 2 }}>
                    {errors.selected_plan}
                  </Alert>
                )}
              </Box>
            )}

            {/* Step 2: Personal Data */}
            {currentStep === 1 && (
              <Box>
                <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 4 }}>
                  <Avatar sx={{ bgcolor: 'primary.main' }}>
                    <IconMail />
                  </Avatar>
                  <Box>
                    <Typography variant="h4" sx={{ fontWeight: 700 }}>
                      I Tuoi Dati Personali
                    </Typography>
                    <Typography variant="body1" color="text.secondary">
                      Crea il tuo account personale
                    </Typography>
                  </Box>
                </Stack>
                
                <Grid container spacing={3}>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      fullWidth
                      label="Nome *"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      error={!!errors.name}
                      helperText={errors.name}
                      variant="outlined"
                    />
                  </Grid>
                  
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      fullWidth
                      label="Cognome *"
                      name="surname"
                      value={formData.surname}
                      onChange={handleChange}
                      error={!!errors.surname}
                      helperText={errors.surname}
                      variant="outlined"
                    />
                  </Grid>
                  
                  <Grid size={{ xs: 12 }}>
                    <TextField
                      fullWidth
                      label="Email *"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleChange}
                      error={!!errors.email}
                      helperText={errors.email}
                      variant="outlined"
                      placeholder="la.tua.email@azienda.com"
                    />
                  </Grid>
                  
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      fullWidth
                      label="Password *"
                      name="password"
                      type="password"
                      value={formData.password}
                      onChange={handleChange}
                      error={!!errors.password}
                      helperText={errors.password}
                      variant="outlined"
                      placeholder="Almeno 8 caratteri"
                    />
                  </Grid>
                  
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      fullWidth
                      label="Conferma Password *"
                      name="confirm_password"
                      type="password"
                      value={formData.confirm_password}
                      onChange={handleChange}
                      error={!!errors.confirm_password}
                      helperText={errors.confirm_password}
                      variant="outlined"
                      placeholder="Ripeti la password"
                    />
                  </Grid>
                </Grid>
              </Box>
            )}

            {/* Step 3: Company Data */}
            {currentStep === 2 && (
              <Box>
                <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 4 }}>
                  <Avatar sx={{ bgcolor: 'success.main' }}>
                    <IconBuilding />
                  </Avatar>
                  <Box>
                    <Typography variant="h4" sx={{ fontWeight: 700 }}>
                      Dati della Tua Azienda
                    </Typography>
                    <Typography variant="body1" color="text.secondary">
                      Configura la tua organizzazione
                    </Typography>
                  </Box>
                </Stack>
                
                <Grid container spacing={3}>
                  <Grid size={{ xs: 12 }}>
                    <TextField
                      fullWidth
                      label="Nome Azienda *"
                      name="company_name"
                      value={formData.company_name}
                      onChange={handleChange}
                      error={!!errors.company_name}
                      helperText={errors.company_name}
                      variant="outlined"
                      placeholder="La Mia Azienda S.r.l."
                    />
                    
                    {slugPreview && (
                      <Card variant="outlined" sx={{ mt: 2, p: 2, bgcolor: 'grey.50' }}>
                        <Typography variant="body2" color="text.secondary">
                          <strong>Slug azienda:</strong>{' '}
                          <Typography component="span" sx={{ fontFamily: 'monospace', color: 'primary.main' }}>
                            {slugPreview}
                          </Typography>
                        </Typography>
                      </Card>
                    )}
                  </Grid>
                  
                  <Grid size={{ xs: 12, md: 6 }}>
                    <FormControl fullWidth>
                      <InputLabel>Dimensione Azienda</InputLabel>
                      <Select
                        name="company_size"
                        value={formData.company_size}
                        label="Dimensione Azienda"
                        onChange={handleChange}
                      >
                        <MenuItem value="small">Piccola (1-10 dipendenti)</MenuItem>
                        <MenuItem value="medium">Media (11-50 dipendenti)</MenuItem>
                        <MenuItem value="large">Grande (50+ dipendenti)</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  
                  <Grid size={{ xs: 12, md: 6 }}>
                    <FormControl fullWidth>
                      <InputLabel>Paese</InputLabel>
                      <Select
                        name="country"
                        value={formData.country}
                        label="Paese"
                        onChange={handleChange}
                      >
                        <MenuItem value="IT">Italia</MenuItem>
                        <MenuItem value="DE">Germania</MenuItem>
                        <MenuItem value="FR">Francia</MenuItem>
                        <MenuItem value="ES">Spagna</MenuItem>
                        <MenuItem value="US">Stati Uniti</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                </Grid>

                {/* Order Summary */}
                <Card variant="outlined" sx={{ mt: 4, p: 3, bgcolor: 'grey.50' }}>
                  <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                    Riepilogo Ordine
                  </Typography>
                  
                  {selectedPlan && (
                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ py: 2 }}>
                      <Box>
                        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                          {selectedPlan.name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {selectedPlan.description}
                        </Typography>
                      </Box>
                      <Typography variant="h6" color={`${selectedPlan.color}.main`} sx={{ fontWeight: 700 }}>
                        {selectedPlan.price}
                      </Typography>
                    </Stack>
                  )}
                  
                  <Divider sx={{ my: 2 }} />
                  
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      Totale (simulato)
                    </Typography>
                    <Typography variant="h5" color="success.main" sx={{ fontWeight: 700 }}>
                      €0,00
                    </Typography>
                  </Stack>
                  
                  <Alert severity="info" sx={{ mt: 2 }}>
                    💡 Questo è solo una simulazione - nessun pagamento verrà effettuato
                  </Alert>
                </Card>

                {response && !response.success && (
                  <Alert severity="error" sx={{ mt: 3 }}>
                    <Typography variant="subtitle2">Errore:</Typography>
                    <Typography variant="body2">{response.error || response.message}</Typography>
                  </Alert>
                )}
              </Box>
            )}

            {/* Navigation */}
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: 4, pt: 3, borderTop: 1, borderColor: 'divider' }}>
              <Button
                variant="outlined"
                startIcon={<IconArrowLeft />}
                onClick={prevStep}
                disabled={currentStep === 0}
                size="large"
              >
                Indietro
              </Button>

              {currentStep < 2 ? (
                <Button
                  variant="contained"
                  endIcon={<IconArrowRight />}
                  onClick={nextStep}
                  size="large"
                  sx={{
                    px: 4,
                    background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`
                  }}
                >
                  Continua
                </Button>
              ) : (
                <Button
                  variant="contained"
                  endIcon={loading ? <CircularProgress size={20} color="inherit" /> : <IconRocket />}
                  onClick={handleSubmit}
                  disabled={loading}
                  size="large"
                  sx={{
                    px: 4,
                    background: `linear-gradient(135deg, ${theme.palette.success.main}, ${theme.palette.success.dark})`
                  }}
                >
                  {loading ? 'Creazione Account...' : '🚀 Crea Account & Simula Pagamento'}
                </Button>
              )}
            </Stack>
          </Box>
        </Card>
      </Container>
    </Box>
  );
};

export default SignupPage;