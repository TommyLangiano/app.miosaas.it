'use client';
import { memo, useMemo } from 'react';

import useMediaQuery from '@mui/material/useMediaQuery';
import Chip from '@mui/material/Chip';
import Drawer from '@mui/material/Drawer';
import Stack from '@mui/material/Stack';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';

// third party
import PerfectScrollbar from 'react-perfect-scrollbar';

// project imports
import MenuList from '../MenuList';
import LogoSection from '../LogoSection';
import MiniDrawerStyled from './MiniDrawerStyled';

import { MenuOrientation } from '../../../config';
import useConfig from '../../../hooks/useConfig';
import { drawerWidth } from '../../../store/constant';

import { handlerDrawerOpen, useGetMenuMaster } from '../../../api/menu';
import { IconPin } from '@tabler/icons-react';

// ==============================|| SIDEBAR DRAWER ||============================== //

function Sidebar() {
  const downMD = useMediaQuery((theme) => theme.breakpoints.down('md'));

  const { menuMaster } = useGetMenuMaster();
  const drawerOpen = menuMaster.isDashboardDrawerOpened || false;

  const { menuOrientation, miniDrawer, mode, onChangeMiniDrawer } = useConfig();

  const logo = useMemo(
    () => (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 2 }}>
        <LogoSection />
        <IconButton size="small" aria-label="toggle-mini-drawer" onClick={() => onChangeMiniDrawer(!miniDrawer)}>
          <IconPin size={18} />
        </IconButton>
      </Box>
    ),
    [miniDrawer, onChangeMiniDrawer]
  );

  const drawer = useMemo(() => {
    const isVerticalOpen = menuOrientation === MenuOrientation.VERTICAL && drawerOpen;
        const appVersion = process.env.NEXT_PUBLIC_VERSION;
        const drawerContent = (
      <>
            {appVersion && (
              <Stack direction="row" sx={{ justifyContent: 'center', mb: 2 }}>
                <Chip label={appVersion} size="small" color="default" />
              </Stack>
            )}
      </>
    );

    let drawerSX = { paddingLeft: '0px', paddingRight: '0px', marginTop: '20px' };
    if (drawerOpen) drawerSX = { paddingLeft: '16px', paddingRight: '16px', marginTop: '0px' };

    return (
      <>
        {downMD ? (
          <Box sx={drawerSX}>
            <MenuList />
            {isVerticalOpen && drawerContent}
          </Box>
        ) : (
          <PerfectScrollbar style={{ height: 'calc(100vh - 88px)', ...drawerSX }}>
            <MenuList />
            {isVerticalOpen && drawerContent}
          </PerfectScrollbar>
        )}
      </>
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [downMD, drawerOpen, menuOrientation, mode]);

  return (
    <Box component="nav" sx={{ flexShrink: { md: 0 }, width: { xs: 'auto', md: drawerWidth } }} aria-label="mailbox folders">
      {downMD || (miniDrawer && drawerOpen) ? (
        <Drawer
          variant={downMD ? 'temporary' : 'persistent'}
          anchor="left"
          open={drawerOpen}
          onClose={() => handlerDrawerOpen(!drawerOpen)}
          sx={{
            '& .MuiDrawer-paper': {
              mt: downMD ? 0 : 11,
              zIndex: 1099,
              width: drawerWidth,
              bgcolor: 'background.default',
              color: 'text.primary',
              borderRight: 'none'
            }
          }}
          ModalProps={{ keepMounted: true }}
          color="inherit"
        >
          {downMD && logo}
          {drawer}
        </Drawer>
      ) : (
        <MiniDrawerStyled variant="permanent" open={drawerOpen}>
          {logo}
          {drawer}
        </MiniDrawerStyled>
      )}
    </Box>
  );
}

export default memo(Sidebar);
