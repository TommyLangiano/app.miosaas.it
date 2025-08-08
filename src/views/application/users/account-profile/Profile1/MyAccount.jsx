'use client';

import { useEffect, useRef, useState } from 'react';

// material-ui
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Avatar from '@mui/material/Avatar';
import Stack from '@mui/material/Stack';

// project imports
import SubCard from '../../../../../ui-component/cards/SubCard';
import AnimateButton from '../../../../../ui-component/extended/AnimateButton';
import axios from '../../../../../utils/axios';

import { gridSpacing } from '../../../../../store/constant';

// Nessuna icona/asset necessario per la nuova UI semplificata

// ==============================|| PROFILE 1 - MY ACCOUNT ||============================== //

export default function MyAccount() {
  // Stato locale per i campi del profilo
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [status, setStatus] = useState('Attivo'); // non modificabile
  const [lastAccess, setLastAccess] = useState('Non disponibile'); // sola lettura

  // Avatar upload/preview
  const [avatarUrl, setAvatarUrl] = useState(null);
  const fileInputRef = useRef(null);

  const handlePickAvatar = () => fileInputRef.current?.click();
  const handleAvatarChange = (event) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setAvatarUrl(typeof reader.result === 'string' ? reader.result : null);
      };
      reader.readAsDataURL(file);
    }
  };

  // Carica dati profilo dal backend
  useEffect(() => {
    const loadProfile = async () => {
      try {
        const res = await axios.get('/api/profile/me');
        const p = res.data?.data || {};
        setFirstName(p.name || '');
        setLastName(p.surname || '');
        setEmail(p.email || '');
        setPhone(p.phone || '');
        setAvatarUrl(p.avatar_url || null);
        setStatus(p.status ? (p.status === 'active' ? 'Attivo' : p.status) : 'Attivo');
        if (p.last_login) {
          try {
            const d = new Date(p.last_login);
            setLastAccess(Number.isNaN(d.getTime()) ? 'Non disponibile' : d.toLocaleString());
          } catch {
            setLastAccess('Non disponibile');
          }
        }
      } catch (err) {
        console.error('Errore caricamento profilo', err);
      }
    };
    loadProfile();
  }, []);

  const handleSave = async () => {
    try {
      await axios.put('/api/profile/me', {
        name: firstName,
        surname: lastName,
        email,
        phone,
        avatar_url: avatarUrl
      });
    } catch (err) {
      console.error('Errore salvataggio profilo', err);
    }
  };

  return (
    <Grid container spacing={gridSpacing}>
      <Grid size={12}>
        <SubCard title="Impostazioni Generali">
          <form noValidate autoComplete="off">
            <Grid container spacing={gridSpacing}>
              {/* Avatar */}
              <Grid size={{ xs: 12 }}>
                <Stack direction="row" spacing={2} alignItems="center">
                  <Avatar src={avatarUrl || undefined} sx={{ width: 72, height: 72 }} />
                  <div>
                    <Typography variant="subtitle1">Avatar</Typography>
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mt: 1 }}>
                      <Button variant="outlined" onClick={handlePickAvatar}>Carica Avatar</Button>
                      {avatarUrl && (
                        <Button color="error" onClick={() => setAvatarUrl(null)}>Rimuovi</Button>
                      )}
                    </Stack>
                    <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={handleAvatarChange} />
                  </div>
                </Stack>
              </Grid>

              {/* Nome */}
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField fullWidth label="Nome" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
              </Grid>
              {/* Cognome */}
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField fullWidth label="Cognome" value={lastName} onChange={(e) => setLastName(e.target.value)} />
              </Grid>
              {/* Email */}
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField type="email" fullWidth label="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </Grid>
              {/* Stato (non modificabile) */}
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField fullWidth label="Stato" value={status} disabled />
              </Grid>
              {/* Telefono */}
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField fullWidth label="Telefono" value={phone} onChange={(e) => setPhone(e.target.value)} />
              </Grid>
              {/* Ultimo Accesso (sola lettura) */}
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField fullWidth label="Ultimo Accesso" value={lastAccess} disabled />
              </Grid>
            </Grid>
          </form>
        </SubCard>
      </Grid>
      {/* Azioni */}
      <Grid size={12}>
        <Divider sx={{ mt: 2 }} />
      </Grid>
      <Grid sx={{ mt: 3 }} size={12}>
        <Grid spacing={2} container sx={{ justifyContent: 'flex-end' }}>
          <Grid>
            <AnimateButton>
              <Button variant="contained" onClick={handleSave}>Salva</Button>
            </AnimateButton>
          </Grid>
          <Grid>
            <Button sx={{ color: 'error.main' }} onClick={() => {
              setFirstName('');
              setLastName('');
              setEmail('');
              setPhone('');
              setAvatarUrl(null);
            }}>Annulla</Button>
          </Grid>
        </Grid>
      </Grid>
    </Grid>
  );
}
