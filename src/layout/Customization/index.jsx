'use client';
import PropTypes from 'prop-types';

import { useState } from 'react';

// material-ui
import { useTheme } from '@mui/material/styles';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Drawer from '@mui/material/Drawer';
import Fab from '@mui/material/Fab';
import Grid from '@mui/material/Grid';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';

// third party
import PerfectScrollbar from 'react-perfect-scrollbar';

// project imports
import FontFamily from './FontFamily';
import BoxContainer from './BoxContainer';
import PresetColor from './PresetColor';
import Layout from './Layout';
import InputFilled from './InputFilled';
import BorderRadius from './BorderRadius';
import ThemeModeLayout from './ThemeMode';
import SidebarDrawer from './SidebarDrawer';
import MenuOrientation from './MenuOrientation';

import { ThemeMode } from '../../config';
import MainCard from '../../ui-component/cards/MainCard';
import AnimateButton from '../../ui-component/extended/AnimateButton';
import useConfig from '../../hooks/useConfig';

// assets
import { IconSettings, IconPlus, IconTextSize, IconColorSwatch } from '@tabler/icons-react';

function CustomTabPanel({ children, value, index, ...other }) {
  return (
    <div role="tabpanel" hidden={value !== index} id={`simple-tabpanel-${index}`} aria-labelledby={`simple-tab-${index}`} {...other}>
      {value === index && <Box>{children}</Box>}
    </div>
  );
}

function a11yProps(index) {
  return {
    id: `simple-tab-${index}`,
    'aria-controls': `simple-tabpanel-${index}`
  };
}

export default function Customization() {
  const theme = useTheme();
  const { mode, onReset } = useConfig();

  // drawer on/off
  const [open, setOpen] = useState(false);
  const handleToggle = () => {
    setOpen(!open);
  };

  const [value, setValue] = useState(0);

  const handleChange = (event, newValue) => {
    setValue(newValue);
  };

  return null;
}

CustomTabPanel.propTypes = { children: PropTypes.node, value: PropTypes.number, index: PropTypes.number, other: PropTypes.any };
