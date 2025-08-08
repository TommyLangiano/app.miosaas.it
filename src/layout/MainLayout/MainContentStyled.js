'use client';
// material-ui
import { styled } from '@mui/material/styles';

// project imports
import { MenuOrientation, ThemeMode } from '../../config';
import { drawerWidth } from '../../store/constant';

// ==============================|| MAIN LAYOUT - STYLED ||============================== //


const MainContentStyled = styled('main', {
  shouldForwardProp: (prop) => prop !== 'open' && prop !== 'menuOrientation' && prop !== 'borderRadius'
})(({ theme, open, menuOrientation, borderRadius }) => ({
  backgroundColor: theme.palette.background.default,
  minWidth: '1%',
  width: '100%',
  minHeight: 'calc(100vh - 88px)',
  flexGrow: 1,
  padding: 20,
  marginTop: 0,
  paddingTop: 88,
  marginRight: 0,
  borderRadius: 0,
  ...(!open && {
    transition: theme.transitions.create('margin', {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.shorter + 200
    }),
    [theme.breakpoints.up('md')]: {
      marginLeft: menuOrientation === MenuOrientation.VERTICAL ? -(drawerWidth - 72) : 0,
      width: `calc(100% - ${drawerWidth}px)`,
      marginTop: 0
    }
  }),
  ...(open && {
    transition: theme.transitions.create('margin', {
      easing: theme.transitions.easing.easeOut,
      duration: theme.transitions.duration.shorter + 200
    }),
    marginLeft: menuOrientation === MenuOrientation.HORIZONTAL ? 0 : 0,
    marginTop: 0,
    width: `calc(100% - ${drawerWidth}px)`,
    [theme.breakpoints.up('md')]: {
      marginTop: 0
    }
  }),
  [theme.breakpoints.down('md')]: {
    marginLeft: 0,
    padding: 16,
    marginTop: 0,
    paddingTop: 88,
    ...(!open && {
      width: `calc(100% - ${drawerWidth}px)`
    })
  },
  [theme.breakpoints.down('sm')]: {
    marginLeft: 0,
    marginRight: 0
  }
}));

export default MainContentStyled;
