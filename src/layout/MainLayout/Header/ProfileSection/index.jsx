'use client';

import { useRef, useState } from 'react';
import { signOut } from 'aws-amplify/auth';

// material-ui
import { useTheme } from '@mui/material/styles';
import Avatar from '@mui/material/Avatar';
import Chip from '@mui/material/Chip';
import ClickAwayListener from '@mui/material/ClickAwayListener';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Paper from '@mui/material/Paper';
import Popper from '@mui/material/Popper';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';

// project imports
import Transitions from '../../../../ui-component/extended/Transitions';
import useConfig from '../../../../hooks/useConfig';

// assets
const User1 = '/assets/images/users/user-round.svg';
import { IconLogout, IconSettings, IconUserCog } from '@tabler/icons-react';
import Link from 'next/link';

export default function ProfileSection() {
  const theme = useTheme();
  const { borderRadius } = useConfig();

  const [open, setOpen] = useState(false);
  const anchorRef = useRef(null);

  const handleToggle = () => {
    setOpen((prevOpen) => !prevOpen);
  };

  const handleClose = (event) => {
    if (anchorRef.current && anchorRef.current.contains(event.target)) return;
    setOpen(false);
  };

  const handleLogout = async () => {
    try {
      localStorage.removeItem('cognito_id_token');
      localStorage.removeItem('cognito_access_token');
      localStorage.removeItem('serviceToken');
      await signOut();
    } catch (err) {
      // ignore
    } finally {
      window.location.href = '/';
    }
  };

  return (
    <>
      <Chip
        sx={{
          ml: 2,
          height: '48px',
          alignItems: 'center',
          borderRadius: '27px',
          '& .MuiChip-label': { lineHeight: 0 }
        }}
        icon={
          <Avatar
            src={User1}
            alt="user-images"
            sx={{ ...theme.typography.mediumAvatar, m: '8px 0 8px 8px !important', cursor: 'pointer' }}
            ref={anchorRef}
            aria-controls={open ? 'menu-list-grow' : undefined}
            aria-haspopup="true"
            color="inherit"
          />
        }
        label={<IconSettings stroke={1.5} size="24px" />}
        ref={anchorRef}
        aria-controls={open ? 'menu-list-grow' : undefined}
        aria-haspopup="true"
        onClick={handleToggle}
        color="primary"
        aria-label="user-account"
      />
      <Popper
        placement="bottom"
        open={open}
        anchorEl={anchorRef.current}
        role={undefined}
        transition
        disablePortal
        modifiers={[{ name: 'offset', options: { offset: [0, 14] } }]}
      >
        {({ TransitionProps }) => (
          <ClickAwayListener onClickAway={handleClose}>
            <Transitions in={open} {...TransitionProps}>
              <Paper>
                {open && (
                  <Box sx={{ p: 1 }}>
                    <List
                      component="nav"
                      sx={{
                        width: '100%',
                        maxWidth: 300,
                        minWidth: 220,
                        borderRadius: `${borderRadius}px`
                      }}
                    >
                      <ListItemButton
                        sx={{ borderRadius: `${borderRadius}px`, mb: 0.5 }}
                        component={Link}
                        href="/impostazioni-account"
                        onClick={() => setOpen(false)}
                      >
                        <ListItemIcon>
                          <IconUserCog stroke={1.5} size="20px" />
                        </ListItemIcon>
                        <ListItemText primary={<Typography variant="body2">Impostazioni Account</Typography>} />
                      </ListItemButton>
                      <ListItemButton sx={{ borderRadius: `${borderRadius}px` }} onClick={handleLogout}>
                        <ListItemIcon>
                          <IconLogout stroke={1.5} size="20px" />
                        </ListItemIcon>
                        <ListItemText primary={<Typography variant="body2">Logout</Typography>} />
                      </ListItemButton>
                    </List>
                  </Box>
                )}
              </Paper>
            </Transitions>
          </ClickAwayListener>
        )}
      </Popper>
    </>
  );
}
