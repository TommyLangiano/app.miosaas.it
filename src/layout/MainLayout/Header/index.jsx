'use client';

// material-ui
import Box from '@mui/material/Box';
import Avatar from '@mui/material/Avatar';

// project imports
import ProfileSection from './ProfileSection';
import SearchSection from './SearchSection';
import LogoSection from '../LogoSection';
import { handlerDrawerOpen, useGetMenuMaster } from '../../../api/menu';
import useConfig from '../../../hooks/useConfig';
import { MenuOrientation, ThemeMode } from '../../../config';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import { IconMenu2 } from '@tabler/icons-react';

// ==============================|| MAIN NAVBAR / HEADER ||============================== //

export default function Header() {
  const theme = useTheme();
  const downMD = useMediaQuery(theme.breakpoints.down('md'));
  const { menuOrientation, mode } = useConfig();
  const { menuMaster } = useGetMenuMaster();
  const drawerOpen = menuMaster.isDashboardDrawerOpened;
  const isHorizontal = menuOrientation === MenuOrientation.HORIZONTAL && !downMD;

  return (
    <>
      <Box sx={{ width: downMD ? 'auto' : 228, display: 'flex', alignItems: 'center' }}>
        <Box component="span" sx={{ display: { xs: 'none', md: 'block' }, flexGrow: 1 }}>
          <LogoSection />
        </Box>
        {!isHorizontal && (
          <Avatar
            variant="rounded"
            sx={{
              ...theme.typography.commonAvatar,
              ...theme.typography.mediumAvatar,
              overflow: 'hidden',
              transition: 'all .2s ease-in-out',
              bgcolor: mode === ThemeMode.DARK ? 'dark.main' : 'secondary.light',
              color: mode === ThemeMode.DARK ? 'secondary.main' : 'secondary.dark',
              '&:hover': {
                bgcolor: mode === ThemeMode.DARK ? 'secondary.main' : 'secondary.dark',
                color: mode === ThemeMode.DARK ? 'secondary.light' : 'secondary.light'
              }
            }}
            onClick={() => handlerDrawerOpen(!drawerOpen)}
            color="inherit"
            aria-label="toggle-drawer"
          >
            <IconMenu2 stroke={1.5} size="20px" />
          </Avatar>
        )}
      </Box>
      <SearchSection />
      <Box sx={{ flexGrow: 1 }} />
      <ProfileSection />
    </>
  );
}
