'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Box, 
  Typography,
  Card,
  Stack,
  Button,
  Avatar,
  LinearProgress,
  useTheme,
  CircularProgress
} from '@mui/material';
import Grid from '@mui/material/Grid2';
import { 
  IconArrowUpRight,
  IconUsers,
  IconTrendingUp,
  IconCurrency,
  IconBell,
  IconSettings,
  IconPlus,
  IconChevronRight
} from '@tabler/icons-react';

// Project imports (semplificati per evitare errori)
// import MainCard from '../../src/ui-component/cards/MainCard';
// import RevenueCard from '../../src/ui-component/cards/RevenueCard';
// import UserCountCard from '../../src/ui-component/cards/UserCountCard';

// Auth Hook
import { useAuth } from '../../src/hooks/useAuth';

export default function DashboardPage() {
  const theme = useTheme();
  const router = useRouter();
  const { loading, isAuthenticated, logout } = useAuth();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      // Redirect to login if not authenticated
      router.push('/');
    }
  }, [loading, isAuthenticated, router]);

  if (loading) {
    return (
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '100vh' 
      }}>
        <CircularProgress size={60} />
      </Box>
    );
  }

  if (!isAuthenticated) {
    return null; // Will redirect
  }

  return (
    <Box>
      {/* Welcome Section */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 4 }}>
        <Box>
          <Typography variant="h2" gutterBottom sx={{ fontWeight: 700 }}>
            Benvenuto nella Dashboard! 👋
          </Typography>
          <Typography variant="h6" color="text.secondary">
            Ecco una panoramica della tua attività oggi
          </Typography>
        </Box>
        <Stack direction="row" spacing={2}>
          <Button
            variant="contained"
            startIcon={<IconPlus />}
            sx={{
              borderRadius: 2,
              px: 3,
              py: 1.5,
              background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`,
            }}
          >
            Nuovo Progetto
          </Button>
          <Button
            variant="outlined"
            color="error"
            onClick={async () => {
              await logout();
              router.push('/');
            }}
            sx={{
              borderRadius: 2,
              px: 3,
              py: 1.5,
            }}
          >
            Logout
          </Button>
        </Stack>
      </Stack>

      {/* Stats Grid */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ 
            p: 3,
            background: `linear-gradient(135deg, ${theme.palette.primary.main}15, ${theme.palette.primary.main}05)`,
            border: `1px solid ${theme.palette.primary.main}20`
          }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Box>
                <Typography variant="h3" sx={{ fontWeight: 700, color: 'primary.main' }}>
                  1,234
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Utenti Totali
                </Typography>
              </Box>
              <Avatar sx={{ 
                bgcolor: 'primary.main', 
                width: 56, 
                height: 56 
              }}>
                <IconUsers size={24} />
              </Avatar>
            </Stack>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mt: 2 }}>
              <IconArrowUpRight size={16} color={theme.palette.success.main} />
              <Typography variant="body2" color="success.main">
                +12.5%
              </Typography>
              <Typography variant="body2" color="text.secondary">
                vs mese scorso
              </Typography>
            </Stack>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ 
            p: 3,
            background: `linear-gradient(135deg, ${theme.palette.success.main}15, ${theme.palette.success.main}05)`,
            border: `1px solid ${theme.palette.success.main}20`
          }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Box>
                <Typography variant="h3" sx={{ fontWeight: 700, color: 'success.main' }}>
                  €45,210
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Ricavi Mensili
                </Typography>
              </Box>
              <Avatar sx={{ 
                bgcolor: 'success.main', 
                width: 56, 
                height: 56 
              }}>
                <IconCurrency size={24} />
              </Avatar>
            </Stack>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mt: 2 }}>
              <IconArrowUpRight size={16} color={theme.palette.success.main} />
              <Typography variant="body2" color="success.main">
                +8.2%
              </Typography>
              <Typography variant="body2" color="text.secondary">
                vs mese scorso
              </Typography>
            </Stack>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ 
            p: 3,
            background: `linear-gradient(135deg, ${theme.palette.warning.main}15, ${theme.palette.warning.main}05)`,
            border: `1px solid ${theme.palette.warning.main}20`
          }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Box>
                <Typography variant="h3" sx={{ fontWeight: 700, color: 'warning.main' }}>
                  89.3%
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Tasso di Conversione
                </Typography>
              </Box>
              <Avatar sx={{ 
                bgcolor: 'warning.main', 
                width: 56, 
                height: 56 
              }}>
                <IconTrendingUp size={24} />
              </Avatar>
            </Stack>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mt: 2 }}>
              <IconArrowUpRight size={16} color={theme.palette.success.main} />
              <Typography variant="body2" color="success.main">
                +3.1%
              </Typography>
              <Typography variant="body2" color="text.secondary">
                vs mese scorso
              </Typography>
            </Stack>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ 
            p: 3,
            background: `linear-gradient(135deg, ${theme.palette.info.main}15, ${theme.palette.info.main}05)`,
            border: `1px solid ${theme.palette.info.main}20`
          }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Box>
                <Typography variant="h3" sx={{ fontWeight: 700, color: 'info.main' }}>
                  156
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Progetti Attivi
                </Typography>
              </Box>
              <Avatar sx={{ 
                bgcolor: 'info.main', 
                width: 56, 
                height: 56 
              }}>
                <IconSettings size={24} />
              </Avatar>
            </Stack>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mt: 2 }}>
              <IconArrowUpRight size={16} color={theme.palette.success.main} />
              <Typography variant="body2" color="success.main">
                +18.7%
              </Typography>
              <Typography variant="body2" color="text.secondary">
                vs mese scorso
              </Typography>
            </Stack>
          </Card>
        </Grid>
      </Grid>

              {/* Main Content Grid */}
        <Grid container spacing={3}>
          {/* Attività Recenti */}
          <Grid item xs={12} md={8}>
            <Card sx={{ height: '100%', p: 3 }}>
              <Typography variant="h5" gutterBottom sx={{ fontWeight: 600 }}>
                Attività Recenti
              </Typography>
              <Stack spacing={3}>
              {[
                {
                  title: 'Nuovo utente registrato',
                  description: 'Marco Rossi si è registrato alla piattaforma',
                  time: '2 minuti fa',
                  type: 'user'
                },
                {
                  title: 'Pagamento ricevuto',
                  description: 'Pagamento di €299 da Azienda XYZ',
                  time: '15 minuti fa',
                  type: 'payment'
                },
                {
                  title: 'Progetto completato',
                  description: 'Il progetto "App Mobile" è stato completato',
                  time: '1 ora fa',
                  type: 'project'
                },
                {
                  title: 'Nuovo lead',
                  description: 'Richiesta di demo da Startup ABC',
                  time: '2 ore fa',
                  type: 'lead'
                }
              ].map((activity, index) => (
                <Card key={index} variant="outlined" sx={{ p: 2, transition: 'all 0.2s', '&:hover': { bgcolor: 'action.hover' } }}>
                  <Stack direction="row" spacing={2} alignItems="center">
                    <Avatar
                      sx={{
                        bgcolor: activity.type === 'user' ? 'primary.main' : 
                                activity.type === 'payment' ? 'success.main' :
                                activity.type === 'project' ? 'info.main' : 'warning.main',
                        width: 40,
                        height: 40
                      }}
                    >
                      {activity.type === 'user' ? <IconUsers size={20} /> :
                       activity.type === 'payment' ? <IconCurrency size={20} /> :
                       activity.type === 'project' ? <IconSettings size={20} /> : <IconBell size={20} />}
                    </Avatar>
                    <Box sx={{ flexGrow: 1 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                        {activity.title}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {activity.description}
                      </Typography>
                    </Box>
                    <Box sx={{ textAlign: 'right' }}>
                      <Typography variant="caption" color="text.secondary">
                        {activity.time}
                      </Typography>
                    </Box>
                  </Stack>
                </Card>
              ))}
            </Stack>
          </Card>
        </Grid>

        {/* Quick Actions & Progress */}
        <Grid item xs={12} md={4}>
          <Stack spacing={3}>
            {/* Quick Actions */}
            <Card sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                Azioni Rapide
              </Typography>
              <Stack spacing={2}>
                {[
                  { label: 'Crea Nuovo Progetto', icon: IconPlus, color: 'primary' },
                  { label: 'Invita Utenti', icon: IconUsers, color: 'success' },
                  { label: 'Visualizza Report', icon: IconTrendingUp, color: 'info' },
                  { label: 'Impostazioni', icon: IconSettings, color: 'warning' }
                ].map((action, index) => (
                  <Button
                    key={index}
                    fullWidth
                    variant="outlined"
                    startIcon={<action.icon size={20} />}
                    endIcon={<IconChevronRight size={16} />}
                    sx={{
                      justifyContent: 'space-between',
                      py: 1.5,
                      borderRadius: 2,
                      borderColor: `${action.color}.main`,
                      color: `${action.color}.main`,
                      '&:hover': {
                        bgcolor: `${action.color}.main`,
                        color: 'white'
                      }
                    }}
                  >
                    {action.label}
                  </Button>
                ))}
              </Stack>
            </Card>

            {/* Progress Overview */}
            <Card sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                Panoramica Obiettivi
              </Typography>
              <Stack spacing={3}>
                <Box>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                    <Typography variant="body2">Ricavi Mensili</Typography>
                    <Typography variant="body2" color="text.secondary">75%</Typography>
                  </Stack>
                  <LinearProgress 
                    variant="determinate" 
                    value={75} 
                    sx={{ 
                      height: 8, 
                      borderRadius: 4,
                      bgcolor: 'grey.200',
                      '& .MuiLinearProgress-bar': {
                        borderRadius: 4,
                        background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`
                      }
                    }} 
                  />
                </Box>
                
                <Box>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                    <Typography variant="body2">Nuovi Utenti</Typography>
                    <Typography variant="body2" color="text.secondary">60%</Typography>
                  </Stack>
                  <LinearProgress 
                    variant="determinate" 
                    value={60} 
                    sx={{ 
                      height: 8, 
                      borderRadius: 4,
                      bgcolor: 'grey.200',
                      '& .MuiLinearProgress-bar': {
                        borderRadius: 4,
                        bgcolor: 'success.main'
                      }
                    }} 
                  />
                </Box>

                <Box>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                    <Typography variant="body2">Progetti Completati</Typography>
                    <Typography variant="body2" color="text.secondary">90%</Typography>
                  </Stack>
                  <LinearProgress 
                    variant="determinate" 
                    value={90} 
                    sx={{ 
                      height: 8, 
                      borderRadius: 4,
                      bgcolor: 'grey.200',
                      '& .MuiLinearProgress-bar': {
                        borderRadius: 4,
                        bgcolor: 'info.main'
                      }
                    }} 
                  />
                </Box>
              </Stack>
            </Card>
          </Stack>
        </Grid>
      </Grid>
    </Box>
  );
}